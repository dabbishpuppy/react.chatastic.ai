
# AI Chatbot Platform

## Project info

**URL**: https://lovable.dev/projects/457a2427-6b8c-4723-9fd8-547ebd4354d9

## Overview

This is a comprehensive AI chatbot platform that allows users to create, customize, and deploy AI agents with full team collaboration features. The platform provides a complete solution for embedding chatbots on websites with extensive customization options.

## Core Features

### Team & Agent Management
- **Multi-team support**: Create and manage multiple teams with role-based access
- **Agent creation**: Build multiple AI agents per team with unique configurations
- **Team collaboration**: Invite team members with different permission levels (owner, member)
- **Agent status management**: Active/inactive agent states with full lifecycle control

### Chat Interface Customization
- **Visual customization**: Change colors, themes, positioning, and branding
- **Suggested messages**: Add quick-click message suggestions for users
- **Initial messages**: Personalize greeting messages and conversation starters
- **Feedback collection**: Enable like/dislike responses for agent improvements
- **Profile customization**: Upload custom profile pictures and chat icons
- **Theme options**: Light/dark mode support with custom color schemes

### Embedding & Deployment
- **Chat bubble embed**: Recommended floating chat bubble for websites
- **Iframe embed**: Direct iframe integration for full-page chat experiences
- **Public sharing**: Generate shareable URLs for direct agent access
- **Identity verification**: Optional user verification for secure conversations
- **Cross-domain support**: Embed on any website with proper CORS handling

### Security & Privacy
- **Agent visibility**: Public/private agent settings with access control
- **Rate limiting**: Configurable message limits to prevent abuse
- **Row-level security**: Database-level security with Supabase RLS policies
- **User authentication**: Secure login/logout with session management

### Analytics & Monitoring
- **Conversation tracking**: Monitor chat history and user interactions
- **Performance metrics**: Response times and usage statistics
- **Activity feeds**: Real-time activity monitoring across teams
- **Lead generation**: Capture and manage user information from chats

### Advanced Features
- **Real-time updates**: Live synchronization of settings across all instances
- **Custom domains**: Connect your own domain for branded experiences
- **Notification system**: Configurable alerts and notifications
- **File uploads**: Support for document and image sharing in chats
- **Responsive design**: Mobile-first design that works on all devices

## Technical Architecture

### Frontend Stack
- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **Tailwind CSS** for utility-first styling
- **Shadcn/ui** for consistent component library
- **React Router** for client-side routing
- **React Query** for server state management

### Backend Integration
- **Supabase** for backend services:
  - PostgreSQL database with RLS policies
  - Real-time subscriptions
  - User authentication
  - Edge functions for custom logic
  - Row-level security for data protection

### Database Schema
- **Teams**: Multi-tenant team management
- **Agents**: Individual chatbot configurations
- **Team Members**: Role-based access control
- **Chat Interface Settings**: Customization preferences per agent

## Getting Started

### Prerequisites
- Node.js & npm installed ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- Supabase account for backend services

### Installation

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Step 3: Install dependencies
npm i

# Step 4: Start the development server
npm run dev
```

### Environment Setup
1. Connect to Supabase using the green Supabase button in the Lovable interface
2. Configure your database tables and RLS policies
3. Set up authentication providers as needed
4. Configure any required API keys in Supabase secrets

## Usage Guide

### Creating Your First Agent
1. Sign up and create your first team
2. Add a new agent with a name and configuration
3. Customize the chat interface in Settings > Chat Interface
4. Configure security settings and rate limiting
5. Generate embed code or share URL for deployment

### Embedding on Your Website

#### Chat Bubble (Recommended)
```html
<script>
(function(){
  window.wonderwaveConfig = {
    agentId: "your-agent-id-here"
  };
  
  function createWonderwaveProxy() {
    if(!window.wonderwave || !window.wonderwave.q) {
      window.wonderwave = function(...args) {
        window.wonderwave.q = window.wonderwave.q || [];
        window.wonderwave.q.push(args);
        return null;
      };
      window.wonderwave.q = [];
    }
    
    return new Proxy(window.wonderwave, {
      get(target, prop) {
        if (prop === 'q') return target.q;
        return (...args) => target(prop, ...args);
      }
    });
  }
  
  window.wonderwave = createWonderwaveProxy();
  
  const script = document.createElement("script");
  script.src = "https://query-spark-start.lovable.app/wonderwave.js";
  script.async = true;
  document.head.appendChild(script);
})();
</script>
```

#### Iframe Embed
```html
<iframe
  src="https://query-spark-start.lovable.app/embed/your-agent-id"
  width="100%"
  style="height: 100%; min-height: 700px"
  frameborder="0">
</iframe>
```

### Direct Sharing
Share your agent directly using:
```
https://query-spark-start.lovable.app/embed/your-agent-id
```

## Customization

### Chat Interface Settings
- **Colors**: Primary, bubble, and user message colors
- **Theme**: Light/dark mode options
- **Position**: Bubble positioning (left/right)
- **Messages**: Initial greetings and suggested responses
- **Branding**: Custom logos and profile pictures
- **Behavior**: Auto-show delays and feedback options

### Security Configuration
- **Visibility**: Public/private agent access
- **Rate Limiting**: Messages per time window
- **Custom Messages**: Rate limit notifications
- **Domain Restrictions**: Control where agents can be embedded

## Deployment

### Using Lovable
1. Open your [Lovable Project](https://lovable.dev/projects/457a2427-6b8c-4723-9fd8-547ebd4354d9)
2. Click Share → Publish
3. Configure your custom domain if needed

### Self-Hosting
The code in your GitHub repository is standard web application code that can be deployed anywhere:
- Vercel, Netlify, or similar platforms
- Your own infrastructure
- Docker containers

## API Integration

### Widget Commands
```javascript
// Show the chat widget
wonderwave('show');

// Hide the chat widget
wonderwave('hide');

// Send a message programmatically
wonderwave('send', 'Hello from the parent page');

// Listen for events
wonderwave('on', 'message', (data) => {
  console.log('Message received:', data);
});
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For technical support and questions:
- [Lovable Documentation](https://docs.lovable.dev/)
- [Lovable Discord Community](https://discord.com/channels/1119885301872070706/1280461670979993613)
- [Supabase Integration Guide](https://docs.lovable.dev/integrations/supabase/)

## License

This project is built with Lovable and follows standard web development practices. Check your specific license requirements based on your deployment needs.

## Technologies Used

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **State Management**: React Query, Context API
- **Styling**: Tailwind CSS with custom theme support
- **Icons**: Lucide React
- **Charts**: Recharts for analytics visualization
- **Authentication**: Supabase Auth with RLS policies
- **Real-time**: Supabase Realtime for live updates
