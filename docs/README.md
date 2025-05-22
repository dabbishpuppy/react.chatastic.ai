
# Wonderwave Documentation

This document provides an overview of the Wonderwave application, its architecture, key components, and technical implementation details.

## 🧱 Tech Stack Overview

- **Frontend**: React with TypeScript
- **UI Framework**: Tailwind CSS with shadcn-ui components
- **Backend**: Supabase (PostgreSQL database with RESTful API)
- **Authentication**: Supabase Auth
- **State Management**: React Context API
- **Routing**: React Router
- **Forms**: React Hook Form with Zod validation

## 🧩 Folder Structure

- `/src`: Main source code directory
  - `/components`: UI components
    - `/dashboard`: Dashboard-related components
    - `/ui`: Reusable UI components (shadcn-ui)
    - `/layout`: Layout components (headers, sidebars)
  - `/contexts`: React contexts (authentication, etc.)
  - `/hooks`: Custom React hooks
  - `/integrations`: External service integrations
    - `/supabase`: Supabase client configuration
  - `/lib`: Utility functions and helpers
  - `/pages`: Page components (Dashboard, Settings, etc.)

## 🔐 Authentication

Authentication is implemented using Supabase Auth with email/password login.

### Configuration:
- Users are stored in Supabase's `auth.users` table
- The application uses the Supabase client to handle authentication
- Token refresh and session management are handled automatically

## 🧠 Business Logic

### Teams

Teams represent organizational units within the application. Each team can have multiple agents and users.

- **Schema**: `teams` table with columns for `id`, `name`, `created_at`, and `updated_at`
- **Access Control**: 
  - Users can only see teams they're members of
  - Only authenticated users can create teams
  - Only team owners can update or delete teams

### Team Members

Team members connect users to teams with specific roles (owner, admin, member).

- **Schema**: `team_members` table with columns for `id`, `team_id`, `user_id`, `role`, and `created_at`
- **Roles**: 
  - `owner`: Has full control over the team
  - `admin`: Can manage team resources but not delete the team
  - `member`: Basic access to team resources

### Agents

Agents are resources that belong to teams.

- **Schema**: `agents` table with columns for `id`, `name`, `team_id`, `color`, `status`, `image`, `created_at`, and `updated_at`
- **Access Control**:
  - Team members can view agents
  - Team owners and admins can create, update, and delete agents

## 🛠 Implemented Features

### Database Functions

- `is_team_member(team_id)`: Checks if the current user is a member of a team
- `is_team_owner(team_id)`: Checks if the current user is the owner of a team
- `get_team_role(team_id)`: Gets the current user's role in a team

### RLS Policies

- Teams:
  - "Authenticated users can create teams"
  - "Users can view their teams"
  - "Team owners can update teams"
  - "Team owners can delete teams"

- Team Members:
  - "Users can view team members"
  - "Team owners can insert team members"
  - "Team owners can update team members"
  - "Team owners can delete team members"
  - "Users can add themselves to teams"

- Agents:
  - "Team owners and admins can create agents"
  - "Team owners and admins can update agents"
  - "Team owners and admins can delete agents"

### UI Components

- Team management interface (create, edit, delete teams)
- Agent management interface (create, edit, delete agents)
- Dashboard for team overview and metrics
- Responsive design with mobile support

## 🔁 Deployment Instructions

### Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables:
   - Create a `.env` file with Supabase connection details
4. Start the development server: `npm run dev`
5. Access the application at `http://localhost:3000`

### Production Deployment

1. Build the application: `npm run build`
2. Deploy the built files to your hosting provider
3. Configure the following environment variables:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## ✅ Todo / Roadmap

- [ ] Implement user profile management
- [ ] Add team invitation system
- [ ] Enhance agent capabilities with AI integration
- [ ] Set up metrics dashboards for teams and agents
- [ ] Add detailed activity logs
- [ ] Implement file storage for assets

