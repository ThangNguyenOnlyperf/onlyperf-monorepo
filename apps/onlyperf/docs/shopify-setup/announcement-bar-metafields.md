# Announcement Bar - Shopify Metafields Setup

This guide shows how to make the site-wide announcement bar editable directly from Shopify Admin using Shop metafields.

## Why Use Metafields?

Currently, the announcement bar content is hardcoded in `src/app/layout.tsx`. This means every time you want to change the message, you need:
- A developer to update the code
- A new deployment

With metafields, you can **edit the announcement banner directly in Shopify Admin** without any code changes or deployments.

---

## Setup Instructions (One-Time)

### Step 1: Access Shop Metafields

1. Log in to your **Shopify Admin**
2. Go to **Settings** (bottom left)
3. Click **Custom data**
4. Select **Shop** from the list
5. Click **Add definition**

### Step 2: Create Metafield Definitions

Create the following metafield definitions one by one:

#### Metafield 1: Enable/Disable Banner
- **Namespace:** `announcement_bar`
- **Key:** `enabled`
- **Name:** "Announcement Bar Enabled"
- **Description:** "Toggle to show or hide the announcement bar site-wide"
- **Type:** `True or false`
- **Validation:** None
- Click **Save**

#### Metafield 2: Message Text
- **Namespace:** `announcement_bar`
- **Key:** `message`
- **Name:** "Announcement Message"
- **Description:** "Main message displayed in the announcement bar"
- **Type:** `Single line text`
- **Validation:** None
- Click **Save**

#### Metafield 3: Call-to-Action Text
- **Namespace:** `announcement_bar`
- **Key:** `cta_text`
- **Name:** "CTA Link Text"
- **Description:** "Text for the call-to-action link (e.g., 'Learn more', 'Shop now')"
- **Type:** `Single line text`
- **Validation:** None
- Click **Save**

#### Metafield 4: Call-to-Action URL
- **Namespace:** `announcement_bar`
- **Key:** `cta_url`
- **Name:** "CTA Link URL"
- **Description:** "Link destination when CTA is clicked"
- **Type:** `URL`
- **Validation:** None
- Click **Save**

---

## How to Edit the Announcement Bar

Once the metafields are set up, editing is easy:

1. Go to **Settings > Custom data > Shop**
2. You'll see your announcement bar fields
3. Edit the values:
   - **Announcement Bar Enabled:** Toggle on/off
   - **Announcement Message:** "Get 30% back when you trade in your current gear"
   - **CTA Link Text:** "Explore offer"
   - **CTA Link URL:** `/trade-in`
4. Click **Save**
5. **Refresh your website** - changes appear immediately (no deployment needed!)
