# Chat Feature - Setup Guide

## Overview
A real-time chat feature has been added to enable direct communication between companies and job seekers after an application is accepted.

## Backend Setup

### 1. Install Dependencies
```bash
# Navigate to project root
cd synapse

# Activate virtual environment
# On Windows:
.\venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install new dependencies
pip install Flask-SocketIO==5.3.5 python-socketio==5.10.0 python-engineio==4.8.0
```

### 2. Run Database Migration
```bash
# Create chat tables (conversations and messages)
python migrate_chat.py
```

### 3. Start Backend Server
```bash
# The backend now uses socketio.run() instead of app.run()
python app.py
```

## Frontend Setup

### 1. Install Dependencies
```bash
# Navigate to frontend directory
cd frontend

# Install socket.io-client
bun install socket.io-client@^4.7.2
```

### 2. Start Frontend
```bash
bun run dev
```

## Features

### For Job Seekers:
- Navigate to **Matches** page
- Find jobs with status "Accepted"
- Click the **Chat** button to start a conversation
- Access all conversations from the **Chat** page in the navigation menu

### For Companies:
- Navigate to **Applicants** page
- Accept an application by clicking the **Accept** button
- Once accepted, a **Chat** button appears
- Click to start chatting with the candidate
- Access all conversations from the **Chat** page in the navigation menu

## Technical Details

### Database Schema
- **conversations**: Stores chat threads (linked to accepted matches)
- **messages**: Individual messages in conversations

### API Endpoints
- `GET /api/chat/conversations` - List all conversations for user
- `GET /api/chat/conversations/<id>/messages` - Get message history
- `POST /api/chat/conversations` - Create new conversation

### WebSocket Events
- `connect` - Client connects
- `join` - Join a conversation room
- `leave` - Leave a conversation room
- `send_message` - Send a new message
- `new_message` - Broadcast new messages to room

### Security
- JWT authentication for both REST and WebSocket
- Authorization checks ensure users can only access their own conversations
- Conversations only created for accepted applications

## UI Components
- **ChatSidebar**: List of conversations with last message preview
- **ChatWindow**: Real-time message interface with input
- **ChatMessage**: Individual message bubbles
- **SocketProvider**: React context for WebSocket connection management

## Troubleshooting

### Chat button not appearing?
- Ensure the application status is "accepted"
- Check that you're on the correct page (Matches for job seekers, Applicants for companies)

### Messages not sending?
- Check browser console for WebSocket connection errors
- Verify backend is running with `socketio.run()`
- Ensure JWT token is valid (try logging out and back in)

### Can't see conversations?
- Make sure at least one application has been accepted
- Verify you've clicked "Chat" button at least once to create the conversation
