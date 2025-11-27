# Visual Storage Management Guide

## Overview

The Visual Storage Management system provides an interactive 2D canvas for visualizing and managing warehouse storage locations with multi-tier shelving support.

## Features

### 1. **Top View (Bản đồ kho)**
- Grid-based warehouse layout
- Drag & drop storage placement
- Visual capacity indicators with color coding:
  - Green: < 50% capacity
  - Blue: 50-70% capacity
  - Yellow: 70-90% capacity
  - Red: > 90% capacity
- Real-time item count visualization

### 2. **Side View (Chi tiết tầng)**
- Tier-by-tier visualization for multi-level shelving
- Shows capacity per tier
- Drag & drop items between tiers
- Visual representation from top to bottom

## Usage

### Viewing Storage Layout

1. Navigate to "Quản lý kho" (Storage Management)
2. Click on "Bản đồ kho" tab
3. View storage blocks positioned on the grid
4. Click any storage block to see tier details

### Edit Mode

1. Click "Chỉnh sửa bố cục" (Edit Layout)
2. Drag unpositioned storages onto the grid
3. Resize storage blocks by dragging corners
4. Save layout when complete

### Managing Tiers

1. Click on a storage block
2. System automatically switches to Side View
3. View items distributed across tiers
4. Drag items between tiers to reorganize

## Database Schema

### New Tables

- `warehouse_layouts`: Store different warehouse configurations
- `storage_tiers`: Individual tier information for each storage

### Updated Tables

- `storages`: Added x, y, width, height, tierCount fields
- `shipment_items`: Added tierNumber field

## Technical Implementation

- Built with React and TypeScript
- Uses @dnd-kit for drag & drop functionality
- Zustand for state management
- Real-time updates with server actions

## Future Enhancements

1. **3D Visualization**: Isometric view option
2. **Path Finding**: Optimal route calculation
3. **Heat Maps**: Usage patterns over time
4. **Mobile Support**: Touch-friendly interface
5. **Export/Import**: Layout configuration files