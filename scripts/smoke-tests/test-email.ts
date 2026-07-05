import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const { sendEmail } = await import('@/lib/email/mailer')

  console.log({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
  })

  const result = await sendEmail({
    to: 'teste@exemplo.com',
    subject: 'Teste de envio via Mailpit',
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h1>Funcionou! 🎉</h1>
        <p>Se você está vendo isso no Mailpit, o SMTP está configurado corretamente.</p>
      </div>
    `,
  })

  console.log(result)
  process.exit(result.accepted ? 0 : 1)
}

main()