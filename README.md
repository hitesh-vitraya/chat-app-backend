# Real-Time Chat Backend

A production-ready Node.js backend for a one-to-one real-time chat application. The project provides JWT authentication, user discovery, conversation management, real-time messaging, typing indicators, seen status, and online presence using Express, MongoDB, Mongoose, and Socket.IO.

## Features

- JWT-based signup, login, and protected routes
- User search with pagination and online-first sorting
- One-to-one conversation creation with duplicate prevention
- Paginated conversation and message APIs
- Real-time message delivery with Socket.IO rooms
- Typing indicators with debounce and auto-stop handling
- Message seen status with bulk database updates
- Online/offline presence and last seen timestamps
- Centralized error handling and request validation
- MongoDB indexes optimized for chat list and message queries

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO

## Folder Structure

+-- app.js
+-- server.js
+-- package.json
+-- src
    +-- config
    |   +-- db.js
    |   +-- env.js
    +-- controllers
    |   +-- authController.js
    |   +-- chatController.js
    |   +-- healthController.js
    |   +-- userController.js
    +-- middleware
    |   +-- authMiddleware.js
    |   +-- errorHandler.js
    |   +-- notFound.js
    +-- models
    |   +-- Conversation.js
    |   +-- Message.js
    |   +-- User.js
    +-- routes
    |   +-- authRoutes.js
    |   +-- chatRoutes.js
    |   +-- healthRoutes.js
    |   +-- index.js
    |   +-- userRoutes.js
    +-- services
    |   +-- authService.js
    |   +-- conversationService.js
    +-- sockets
    |   +-- index.js
    |   +-- handlers
    |       +-- connectionHandler.js
    |       +-- messageHandler.js
    |       +-- seenHandler.js
    |       +-- typingHandler.js
    +-- utils
        +-- AppError.js
```

## Environment Variables

Create a `.env` file in the project root:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/realtime-chat
JWT_SECRET=replace_with_a_strong_secret
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:3000
```

Required variables:

| Variable         | Required | Description                         |
| ---------------- | -------- | ----------------------------------- |
| `MONGODB_URI`    | Yes      | MongoDB connection string           |
| `JWT_SECRET`     | Yes      | Secret used to sign and verify JWTs |
| `NODE_ENV`       | No       | Runtime environment                 |
| `PORT`           | No       | Server port, defaults to `5000`     |
| `JWT_EXPIRES_IN` | No       | JWT lifetime, defaults to `7d`      |
| `CLIENT_ORIGIN`  | No       | Allowed frontend origin for CORS    |

## Installation

```bash
npm install
```

## Backend Setup

1. Install dependencies.
2. Create the `.env` file.
3. Start MongoDB locally or configure `MONGODB_URI` for MongoDB Atlas.
4. Run the server.

## Running Locally

Development:

```bash
npm run dev
```

Production-style start:

```bash
npm start
```

Base URL:

```txt
http://localhost:5000/api
```

## Socket Architecture

Socket.IO is initialized in `server.js` through `src/sockets/index.js`. Every socket connection is authenticated using the JWT provided during the handshake.

Client connection example:

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: {
    token: "JWT_TOKEN",
  },
});
```

The backend also supports an authorization header during the socket handshake:

```txt
Authorization: Bearer JWT_TOKEN
```

After authentication:

- `socket.user` contains the authenticated user document.
- Each socket joins a room named by its user id.
- Real-time events are delivered using user-id rooms.
- Presence is tracked in memory using `Map<userId, Set<socketId>>`.
- Multiple tabs/devices are handled without marking a user offline until the final socket disconnects.

### Socket Events

    #### Send Message

    #### Typing Indicator

    #### Message Seen

    #### Presence


## API Documentation

All protected routes require:

```txt
Authorization: Bearer JWT_TOKEN
```

### Authentication

#### POST `/api/auth/signup`

```json
{
  "name": "Hitesh",
  "email": "hitesh@example.com",
  "password": "password123"
}
```

#### POST `/api/auth/login`

```json
{
  "email": "hitesh@example.com",
  "password": "password123"
}
```

#### GET `/api/auth/me`

Returns the authenticated user.

### Users

#### GET `/api/users/search?query=&page=1&limit=20`

Returns users except the currently authenticated user.

Response data shape:

```json
{
  "users": [
    {
      "_id": "USER_ID",
      "name": "User Name",
      "email": "user@example.com",
      "isOnline": true,
      "lastSeen": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalUsers": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

### Chat

#### POST `/api/chat/start`

Starts or returns an existing one-to-one conversation.

```json
{
  "receiverId": "USER_ID"
}
```

#### GET `/api/chat/conversations`

Returns latest conversations with:

- participants
- last message
- unread count
- latest activity sorting

#### GET `/api/chat/messages/:conversationId?page=1&limit=20`

Returns paginated messages for infinite scroll.

Pagination response:

```json
{
  "page": 1,
  "limit": 20,
  "totalMessages": 42,
  "totalPages": 3,
  "hasNextPage": true,
  "hasPrevPage": false
}
```

## Data Model Notes

### User

Stores authentication and presence fields:

- `name`
- `email`
- `password`
- `isOnline`
- `lastSeen`

### Conversation

Stores one-to-one chat metadata:

- `participants`
- `participantKey`
- `lastMessage`
- `createdAt`
- `updatedAt`

`participantKey` is deterministic and unique, which helps prevent duplicate one-to-one conversations.

### Message

Stores individual chat messages:

- `conversationId`
- `sender`
- `receiver`
- `text`
- `status`: `sent` or `seen`
- `createdAt`
