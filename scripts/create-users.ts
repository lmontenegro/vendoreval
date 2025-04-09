const { createClient } = require('@supabase/supabase-js')
const { mockUsers } = require('../lib/supabase/mock-data')

// Configuración de Supabase Admin (necesitarás el service_role key)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Este es diferente del ANON_KEY
)

async function createUsers() {
    for (const mockUser of mockUsers) {
        try {
            // 1. Crear el usuario en auth.users
            const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: mockUser.email,
                password: mockUser.password,
                email_confirm: true, // Auto confirmar el email
                user_metadata: {
                    company_name: mockUser.profile.company_name,
                    role: mockUser.profile.role
                }
            })

            if (authError) {
                console.error(`Error creating auth user ${mockUser.email}:`, authError)
                continue
            }

            // 2. Crear el perfil del usuario
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .insert([{
                    id: authUser.user.id,
                    company_name: mockUser.profile.company_name,
                    contact_email: mockUser.profile.contact_email,
                    role: mockUser.profile.role,
                    is_active: mockUser.profile.is_active,
                    contact_phone: mockUser.profile.contact_phone,
                    created_at: mockUser.profile.created_at,
                    last_login: mockUser.profile.last_login,
                    department: mockUser.profile.department,
                    avatar_url: mockUser.profile.avatar_url,
                    business_details: mockUser.profile.business_details
                }])

            if (profileError) {
                console.error(`Error creating profile for ${mockUser.email}:`, profileError)
                continue
            }

            console.log(`Successfully created user and profile for ${mockUser.email}`)
        } catch (error) {
            console.error(`Unexpected error for ${mockUser.email}:`, error)
        }
    }
}

// Ejecutar el script
createUsers()
    .then(() => console.log('Finished creating users'))
    .catch(console.error) 