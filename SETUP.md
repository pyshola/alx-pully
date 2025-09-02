# Supabase Authentication Setup Guide

This guide will walk you through setting up Supabase authentication for your Next.js polling app.

## Prerequisites

- Node.js 18+ installed
- A Supabase account
- Git

## 1. Supabase Project Setup

### Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: `alx-pully` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be created (2-3 minutes)

### Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL**
   - **Project API Key** (anon/public key)
   - **Project API Key** (service_role key - keep this secret!)

## 2. Environment Variables Setup

1. In your project root, create `.env.local`:

```bash
cp .env.local.example .env.local
```

2. Fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 3. Database Schema Setup

### Option A: Using Supabase Dashboard (Recommended for beginners)

1. In your Supabase dashboard, go to the **SQL Editor**
2. Click "New Query"
3. Copy and paste the contents of `supabase/migrations/001_create_profiles.sql`
4. Click "Run" to execute the migration

### Option B: Using Supabase CLI (Recommended for developers)

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref your-project-ref
```

4. Run migrations:
```bash
supabase db push
```

## 4. Configure Authentication Settings

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Configure the following:

### Site URL Configuration
- **Site URL**: `http://localhost:3000` (for development)
- **Redirect URLs**: Add `http://localhost:3000/auth/callback`

### Email Templates (Optional)
- Customize confirmation and password reset emails
- Update the redirect URLs to match your domain

### Providers (Optional)
- Enable additional auth providers (Google, GitHub, etc.)
- Configure OAuth credentials if needed

## 5. Row Level Security (RLS) Setup

The migration script automatically sets up RLS policies, but here's what it does:

### Profiles Table Policies:
- **SELECT**: Anyone can view public profile information
- **INSERT**: Users can only create their own profile
- **UPDATE**: Users can only update their own profile

### For Future Poll Tables:
You'll need to add similar policies for polls and votes:

```sql
-- Example policy for polls table
CREATE POLICY "Users can view public polls" 
ON polls FOR SELECT 
USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "Users can create their own polls" 
ON polls FOR INSERT 
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Users can update their own polls" 
ON polls FOR UPDATE 
USING (creator_id = auth.uid());
```

## 6. Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

## 7. Test the Setup

1. Start your development server:
```bash
npm run dev
```

2. Navigate to `http://localhost:3000/register`
3. Try creating a new account
4. Check your email for confirmation link
5. Try logging in with the created account

## 8. Troubleshooting

### Common Issues:

#### "Invalid JWT" Error
- Check that your environment variables are correctly set
- Ensure you're using the correct Supabase URL and keys
- Restart your dev server after changing environment variables

#### Email Confirmation Not Working
- Check your Supabase email settings
- Verify redirect URLs are correctly configured
- Check spam folder for confirmation emails

#### Profile Not Created After Signup
- Verify the database trigger is properly installed
- Check the Supabase logs in the dashboard
- Ensure the username is being passed in the signup metadata

#### CORS Errors
- Make sure your Site URL is configured correctly in Supabase
- Add your domain to the allowed origins

### Debugging Steps:

1. **Check Supabase Logs**:
   - Go to your Supabase dashboard
   - Navigate to **Logs** → **Auth**
   - Look for error messages

2. **Verify Database Schema**:
   ```sql
   -- Run this in SQL Editor to check if profiles table exists
   SELECT * FROM profiles LIMIT 1;
   ```

3. **Test Auth Functions**:
   - Use the browser developer tools to check for JavaScript errors
   - Verify network requests to Supabase are successful

## 9. Production Deployment

### Update Environment Variables for Production:

1. Set your production domain in Supabase:
   - **Site URL**: `https://yourdomain.com`
   - **Redirect URLs**: `https://yourdomain.com/auth/callback`

2. Update your production environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Security Checklist:

- [ ] Service role key is only used server-side
- [ ] RLS is enabled on all tables
- [ ] Policies are properly configured
- [ ] Email confirmation is enabled for production
- [ ] CORS is properly configured

## 10. Next Steps

After completing the setup:

1. **Customize Email Templates**: Brand your confirmation emails
2. **Add Social Login**: Configure OAuth providers
3. **Implement Password Reset**: Add forgot password functionality
4. **Add Profile Management**: Let users update their profiles
5. **Set up Real-time**: Use Supabase real-time for live poll updates

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Supabase Discord Community](https://discord.supabase.com)

## File Structure After Setup

```
alx-pully/
├── contexts/
│   └── auth-context.tsx          # Auth context provider
├── lib/
│   └── supabase.ts               # Supabase client configuration
├── components/
│   └── auth/
│       ├── login-form.tsx        # Updated login form
│       ├── register-form.tsx     # Updated register form
│       └── protected-route.tsx   # Route protection component
├── middleware.ts                 # Auth middleware
├── .env.local                    # Environment variables
└── supabase/
    └── migrations/
        └── 001_create_profiles.sql # Database schema
```

## 11. Database Schema Setup

After setting up authentication, you need to create the database schema for polls and votes.

### Run Database Migrations

1. **Using Supabase Dashboard** (Recommended for beginners):
   - Go to your Supabase dashboard → **SQL Editor**
   - Create a new query
   - Copy and paste the contents of `supabase/migrations/002_create_polls_schema.sql`
   - Click "Run" to execute the migration

2. **Using Supabase CLI** (Recommended for developers):
   ```bash
   # Run the polls schema migration
   supabase db push
   ```

### What the Schema Creates

The migration creates the following tables:

#### **polls** table:
- Stores poll information (title, description, creator, settings)
- Supports public/private polls, multiple votes, anonymous voting
- Includes expiration dates and timestamps

#### **poll_options** table:
- Stores the options for each poll
- Ordered options with unique constraints

#### **votes** table:
- Records individual votes with user or fingerprint tracking
- Prevents duplicate votes based on poll settings
- Supports both authenticated and anonymous voting

#### **poll_views** table:
- Tracks poll views for analytics
- Prevents duplicate view counting

#### **poll_shares** table:
- Tracks how polls are shared (optional)
- Records share methods and recipients

#### **popular_polls** materialized view:
- Pre-calculated popular polls based on votes, views, and recency
- Refreshed periodically for performance

### Database Functions

The schema includes several PostgreSQL functions:

- `get_poll_results(poll_uuid)` - Returns poll results with percentages
- `get_user_poll_stats(user_uuid)` - Returns user's poll statistics
- `refresh_popular_polls()` - Refreshes the popular polls view
- `validate_vote()` - Ensures vote constraints are enforced
- `handle_updated_at()` - Automatically updates timestamps

### Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:

- **Polls**: Users can view public polls or their own polls
- **Options**: Visible based on poll access
- **Votes**: Can vote on accessible polls, view aggregated results
- **Views/Shares**: Analytics data accessible to poll creators

### Testing the Schema

After running the migration, test the setup:

1. **Create a Poll**:
   ```bash
   curl -X POST http://localhost:3000/api/polls \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{
       "title": "Test Poll",
       "options": ["Option 1", "Option 2"],
       "is_public": true,
       "allow_multiple_votes": false
     }'
   ```

2. **Vote on a Poll**:
   ```bash
   curl -X POST http://localhost:3000/api/polls/POLL_ID/vote \
     -H "Content-Type: application/json" \
     -d '{
       "option_ids": ["OPTION_ID"]
     }'
   ```

3. **View Results**:
   - Navigate to `http://localhost:3000/polls/POLL_ID`
   - Results should display with percentages

## 12. Performance Optimization

### Database Indexes

The schema includes optimized indexes for:
- Poll queries by creator, public status, creation date
- Vote counting and aggregation
- Search functionality
- Analytics queries

### Materialized Views

The `popular_polls` view is materialized for better performance:

```sql
-- Refresh popular polls (run periodically)
SELECT refresh_popular_polls();
```

Consider setting up a cron job to refresh this view regularly.

Your authentication system and database schema are now fully configured and ready to use!