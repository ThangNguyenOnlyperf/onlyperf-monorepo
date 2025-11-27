#!/bin/bash

# Typesense VPS Deployment Script
# This script automates the deployment of Typesense on Ubuntu/Debian VPS
# Supports Ubuntu 20.04/22.04 and Debian 11/12

set -e

# Configuration variables
TYPESENSE_VERSION="26.0"
TYPESENSE_API_KEY=$(openssl rand -hex 32)
DOMAIN_NAME=""
EMAIL=""
TYPESENSE_PORT="8108"
USE_SSL="yes"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Function to check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        exit 1
    fi
}

# Function to detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        print_error "Cannot detect OS version"
        exit 1
    fi
    print_info "Detected OS: $OS $VER"
}

# Function to update system
update_system() {
    print_info "Updating system packages..."
    apt-get update -y
    apt-get upgrade -y
}

# Function to install dependencies
install_dependencies() {
    print_info "Installing dependencies..."
    apt-get install -y \
        curl \
        wget \
        ufw \
        nginx \
        certbot \
        python3-certbot-nginx \
        jq
}

# Function to install Typesense
install_typesense() {
    print_info "Installing Typesense $TYPESENSE_VERSION..."
    
    # Download and install Typesense
    wget -qO- https://dl.typesense.org/releases/${TYPESENSE_VERSION}/typesense-server-${TYPESENSE_VERSION}-amd64.deb > typesense.deb
    apt-get install -y ./typesense.deb
    rm typesense.deb
    
    print_info "Typesense installed successfully"
}

# Function to configure Typesense
configure_typesense() {
    print_info "Configuring Typesense..."
    
    # Create data directory
    mkdir -p /var/lib/typesense
    
    # Create configuration file
    cat > /etc/typesense/typesense-server.ini << EOL
; Typesense Configuration File

[server]

api-address = 0.0.0.0
api-port = ${TYPESENSE_PORT}
data-dir = /var/lib/typesense
api-key = ${TYPESENSE_API_KEY}
log-level = info
enable-cors = true

; Vietnamese language support
enable-search-analytics = true

; Performance settings
thread-pool-size = 8
num-memory-shards = 4

; Security settings
ssl-certificate = 
ssl-certificate-key = 
EOL

    # Create systemd service file
    cat > /etc/systemd/system/typesense.service << EOL
[Unit]
Description=Typesense Server
After=network.target

[Service]
Type=simple
Restart=on-failure
RestartSec=10
User=root
ExecStart=/usr/bin/typesense-server --config=/etc/typesense/typesense-server.ini
StandardOutput=append:/var/log/typesense/typesense.log
StandardError=append:/var/log/typesense/typesense.log

[Install]
WantedBy=multi-user.target
EOL

    # Create log directory
    mkdir -p /var/log/typesense
    
    # Reload systemd and start Typesense
    systemctl daemon-reload
    systemctl enable typesense
    systemctl start typesense
    
    print_info "Typesense configured and started"
}

# Function to configure firewall
configure_firewall() {
    print_info "Configuring firewall..."
    
    # Enable UFW
    ufw --force enable
    
    # Allow SSH, HTTP, HTTPS
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Allow Typesense port only from localhost (nginx will proxy)
    ufw allow from 127.0.0.1 to any port ${TYPESENSE_PORT}
    
    print_info "Firewall configured"
}

# Function to configure Nginx reverse proxy
configure_nginx() {
    print_info "Configuring Nginx reverse proxy..."
    
    # Create Nginx configuration
    cat > /etc/nginx/sites-available/typesense << EOL
server {
    listen 80;
    server_name ${DOMAIN_NAME};
    
    location / {
        proxy_pass http://localhost:${TYPESENSE_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CORS headers for Vercel
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,X-TYPESENSE-API-KEY';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
        
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,X-TYPESENSE-API-KEY' always;
    }
}
EOL

    # Enable the site
    ln -sf /etc/nginx/sites-available/typesense /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    nginx -t
    
    # Restart Nginx
    systemctl restart nginx
    
    print_info "Nginx configured"
}

# Function to setup SSL
setup_ssl() {
    if [ "$USE_SSL" = "yes" ] && [ -n "$DOMAIN_NAME" ] && [ -n "$EMAIL" ]; then
        print_info "Setting up SSL certificate..."
        certbot --nginx -d ${DOMAIN_NAME} --non-interactive --agree-tos -m ${EMAIL}
        
        # Setup auto-renewal
        cat > /etc/cron.d/certbot-renewal << EOL
0 0,12 * * * root certbot renew --quiet --no-self-upgrade
EOL
        
        print_info "SSL certificate installed"
    else
        print_warning "Skipping SSL setup. Configure manually later."
    fi
}

# Function to create helper scripts
create_helper_scripts() {
    print_info "Creating helper scripts..."
    
    # Create collection initialization script
    cat > /root/init-typesense-collections.sh << 'EOL'
#!/bin/bash

# Typesense Collection Initialization Script
# Run this after deployment to create collections

TYPESENSE_HOST="localhost:8108"
TYPESENSE_API_KEY="$1"

if [ -z "$TYPESENSE_API_KEY" ]; then
    echo "Usage: $0 <API_KEY>"
    exit 1
fi

# Create products collection
curl -X POST "http://${TYPESENSE_HOST}/collections" \
  -H "X-TYPESENSE-API-KEY: ${TYPESENSE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "products",
    "fields": [
      {"name": "id", "type": "string"},
      {"name": "name", "type": "string"},
      {"name": "brand", "type": "string", "facet": true},
      {"name": "model", "type": "string", "facet": true},
      {"name": "category", "type": "string", "facet": true},
      {"name": "qr_code", "type": "string"},
      {"name": "status", "type": "string", "facet": true},
      {"name": "storage_id", "type": "string", "facet": true, "optional": true},
      {"name": "storage_name", "type": "string", "optional": true},
      {"name": "created_at", "type": "int64"}
    ],
    "default_sorting_field": "created_at"
  }'

# Create shipments collection
curl -X POST "http://${TYPESENSE_HOST}/collections" \
  -H "X-TYPESENSE-API-KEY: ${TYPESENSE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "shipments",
    "fields": [
      {"name": "id", "type": "string"},
      {"name": "receipt_number", "type": "string"},
      {"name": "supplier_name", "type": "string", "facet": true},
      {"name": "supplier_id", "type": "string"},
      {"name": "receipt_date", "type": "int64"},
      {"name": "status", "type": "string", "facet": true},
      {"name": "item_count", "type": "int32", "facet": true},
      {"name": "notes", "type": "string", "optional": true},
      {"name": "created_by", "type": "string", "facet": true},
      {"name": "created_at", "type": "int64"}
    ],
    "default_sorting_field": "created_at"
  }'

# Create storages collection
curl -X POST "http://${TYPESENSE_HOST}/collections" \
  -H "X-TYPESENSE-API-KEY: ${TYPESENSE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "storages",
    "fields": [
      {"name": "id", "type": "string"},
      {"name": "name", "type": "string"},
      {"name": "location", "type": "string", "facet": true, "optional": true},
      {"name": "capacity", "type": "int32", "facet": true},
      {"name": "current_occupancy", "type": "int32", "facet": true},
      {"name": "utilization_rate", "type": "float", "facet": true},
      {"name": "priority", "type": "int32", "facet": true},
      {"name": "created_at", "type": "int64"}
    ],
    "default_sorting_field": "priority"
  }'

echo "Collections created successfully!"
EOL

    chmod +x /root/init-typesense-collections.sh
    
    # Create health check script
    cat > /root/check-typesense-health.sh << 'EOL'
#!/bin/bash

# Typesense Health Check Script

TYPESENSE_HOST="localhost:8108"
TYPESENSE_API_KEY="$1"

if [ -z "$TYPESENSE_API_KEY" ]; then
    echo "Usage: $0 <API_KEY>"
    exit 1
fi

curl -s "http://${TYPESENSE_HOST}/health" \
  -H "X-TYPESENSE-API-KEY: ${TYPESENSE_API_KEY}" | jq .
EOL

    chmod +x /root/check-typesense-health.sh
    
    print_info "Helper scripts created"
}

# Function to display completion message
display_completion() {
    print_info "==================== Installation Complete ===================="
    echo ""
    echo "Typesense has been successfully installed and configured!"
    echo ""
    echo "Important Information:"
    echo "---------------------"
    echo "API Key: ${TYPESENSE_API_KEY}"
    echo "API URL: ${USE_SSL:+https://}${USE_SSL:-http://}${DOMAIN_NAME:-YOUR_SERVER_IP}"
    echo "Port: ${TYPESENSE_PORT} (proxied through Nginx)"
    echo ""
    echo "Next Steps:"
    echo "-----------"
    echo "1. Save the API key above - you'll need it for your Next.js app"
    echo "2. Run: /root/init-typesense-collections.sh <API_KEY> to create collections"
    echo "3. Update your .env.local in Next.js with:"
    echo "   TYPESENSE_HOST=${DOMAIN_NAME:-YOUR_SERVER_IP}"
    echo "   TYPESENSE_PORT=443"
    echo "   TYPESENSE_PROTOCOL=https"
    echo "   TYPESENSE_API_KEY=${TYPESENSE_API_KEY}"
    echo ""
    echo "Useful Commands:"
    echo "---------------"
    echo "Check service status: systemctl status typesense"
    echo "View logs: journalctl -u typesense -f"
    echo "Restart service: systemctl restart typesense"
    echo "Check health: /root/check-typesense-health.sh <API_KEY>"
    echo ""
    print_info "=============================================================="
}

# Main installation flow
main() {
    print_info "Starting Typesense VPS deployment..."
    
    # Get user input
    read -p "Enter your domain name (e.g., search.yourdomain.com): " DOMAIN_NAME
    read -p "Enter your email for SSL certificate: " EMAIL
    read -p "Use SSL? (yes/no) [yes]: " USE_SSL
    USE_SSL=${USE_SSL:-yes}
    
    # Run installation steps
    check_root
    detect_os
    update_system
    install_dependencies
    install_typesense
    configure_typesense
    configure_firewall
    configure_nginx
    setup_ssl
    create_helper_scripts
    display_completion
}

# Run main function
main