
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

- **Schema**: `teams` table with columns for `id`, `name`, `created_at`, `updated_at`, and `created_by`
- **Ownership**: Teams are tied to users via the `created_by` field which stores the user's ID
- **Access Control**: 
  - Users can only see teams they're members of
  - Only authenticated users can create teams
  - Only team owners can update or delete teams
  - RLS policies use `created_by` field to ensure only the creator can insert or view teams

**Example Insert Code for Teams**:
```typescript
const { data, error } = await supabase
  .from('teams')
  .insert({
    name: 'New Team Name',
    created_by: user.id // Set the created_by field to current user's ID
  });
```

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

## 🔐 Security

Wonderwave implements a comprehensive security model to protect user data and enforce proper access controls:

### Row Level Security (RLS)

The application uses Supabase Row Level Security (RLS) policies to restrict data access at the database level:

- **User-Specific Data**: Each record is associated with a specific user through direct ownership (`created_by`) or team membership
- **Policy Enforcement**: Database queries automatically filter results based on the current user's permissions
- **Zero Trust Model**: By default, tables deny access unless explicitly allowed via policies

### Role-based Access Control

Access is managed through the `team_members` table using three role levels:

- **Owner**: Full control over team resources (create, read, update, delete)
- **Admin**: Elevated privileges for managing team resources but cannot delete teams
- **Member**: Basic access to view and use team resources

### Security Implementation

- **Authentication Token**: `auth.uid()` function is used in policies to identify the current user
- **Ownership Verification**: `created_by` field is used to verify record ownership
- **Function-Based Policies**: Database functions (`is_team_member`, `is_team_owner`, `get_team_role`) simplify complex permission checks
- **Security Definer Functions**: Functions execute with elevated privileges but verify user permissions

**Example RLS Policy**:
```sql
-- Users can only view their own teams
CREATE POLICY "Users can view their own teams"
ON teams FOR SELECT
USING (auth.uid() = created_by OR public.is_team_member(id));
```

## 🛠 Implemented Features

### Database Functions

- `is_team_member(team_id)`: Checks if the current user is a member of a team
- `is_team_owner(team_id)`: Checks if the current user is the owner of a team
- `get_team_role(team_id)`: Gets the current user's role in a team

### RLS Policies

- Teams:
  - "Authenticated users can create teams"
  - "Users can view their own teams" (scoped by `created_by` and team membership)
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

