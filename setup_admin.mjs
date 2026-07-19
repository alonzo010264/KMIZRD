/**
 * create_admin_table.mjs
 * Creates the admin_users table in Supabase via SQL REST API
 */
const SUPABASE_URL = 'https://hgjcmsqforkvcfatygsl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Ij2NSppTJRCxCpLzOOtLNA_OZY1RKZS';

const ADMIN_EMAIL = 'admin@kmizrd.com';

// First sign in to get a token
async function signIn() {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: 'Kmizrd2024!' })
    });
    const data = await res.json();
    return data.access_token;
}

async function main() {
    console.log('Iniciando sesión para obtener token...');
    const token = await signIn();

    if (!token) {
        console.error('No se pudo obtener token de acceso.');
        return;
    }
    console.log('✅ Token obtenido.');

    // Try to insert using authenticated token
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/admin_users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`,
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
            email: ADMIN_EMAIL,
            created_at: new Date().toISOString()
        })
    });

    console.log('Insert response status:', insertRes.status);

    if (insertRes.status === 201 || insertRes.status === 204 || insertRes.status === 200) {
        console.log('✅ Usuario admin registrado en admin_users.');
    } else {
        const text = await insertRes.text();
        console.log('Response:', text);

        // Table doesn't exist - need to create via RPC or SQL
        // Try using Postgres REST endpoint
        console.log('\nLa tabla admin_users no existe todavia.');
        console.log('Ve al panel de Supabase y ejecuta este SQL en SQL Editor:');
        console.log('\n--- COPIA Y PEGA ESTO EN SUPABASE > SQL EDITOR ---\n');
        console.log(`CREATE TABLE IF NOT EXISTS public.admin_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text UNIQUE NOT NULL,
    auth_uid uuid,
    last_login timestamptz,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read" ON public.admin_users FOR SELECT USING (true);
CREATE POLICY "Allow anon insert" ON public.admin_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update" ON public.admin_users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete" ON public.admin_users FOR DELETE USING (true);

-- Insert the initial admin user
INSERT INTO public.admin_users (email, created_at)
VALUES ('${ADMIN_EMAIL}', now())
ON CONFLICT (email) DO NOTHING;`);
    }
}

main().catch(console.error);
