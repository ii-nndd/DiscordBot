const { Client, GatewayIntentBits, REST, Routes, Collection, ChannelType } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ]
});

// تهيئة ذكاء جوجل (Gemini)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

client.commands = new Collection();
const commandsArray = [];

// نظام الأوامر التلقائي
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commandsArray.push(command.data.toJSON());
        }
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// الداشبورد الفخم
app.get('/', (req, res) => {
    const guild = client.guilds.cache.first();
    const guildName = guild ? guild.name : "Arthur & Joud Private Vibe";
    const memberCount = guild ? guild.memberCount : 2;
    const botPing = client.ws.ping;

    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>ND • ARTHUR BOT - Master Control</title>
            <style>
                body { background: #0b0f19; color: #f8fafc; font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; display: flex; height: 100vh; overflow: hidden; }
                .sidebar { width: 260px; background: #111827; border-left: 1px solid #1f2937; display: flex; flex-direction: column; padding: 20px; }
                .logo { font-size: 20px; font-weight: bold; color: #ec4899; margin-bottom: 30px; text-align: center; }
                .menu-item { padding: 12px 15px; margin-bottom: 8px; border-radius: 8px; color: #9ca3af; text-decoration: none; display: block; font-size: 14px; background: #1f2937; color: #fff; text-align: center; font-weight: bold; }
                .main-content { flex: 1; padding: 40px; overflow-y: auto; background: #0b0f19; }
                .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 1px solid #1f2937; padding-bottom: 20px; }
                .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
                .stat-card { background: #111827; padding: 20px; border-radius: 12px; border: 1px solid #1f2937; text-align: center; }
                .stat-card h3 { margin: 0; font-size: 14px; color: #9ca3af; }
                .stat-card p { font-size: 22px; font-weight: bold; color: #ec4899; margin: 10px 0 0 0; }
                .panel-section { background: #111827; padding: 25px; border-radius: 12px; border: 1px solid #1f2937; margin-bottom: 20px; }
                .panel-section h2 { font-size: 18px; color: #f3f4f6; margin-top: 0; }
                input { width: 100%; padding: 12px; margin: 10px 0 20px 0; background: #1f2937; border: 1px solid #374151; color: white; border-radius: 8px; box-sizing: border-box; }
                button { background: #ec4899; color: white; border: none; padding: 12px 25px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; }
                button:hover { background: #db2777; }
                .badge { background: #374151; padding: 6px 12px; border-radius: 6px; font-size: 13px; color: #d1d5db; }
            </style>
        </head>
        <body>
            <div class="sidebar">
                <div class="logo">🌙 ARTHUR BOT</div>
                <div class="menu-item">🟢 لوحة التحكم النشطة</div>
            </div>
            <div class="main-content">
                <div class="header">
                    <div>
                        <h1 style="margin:0; font-size:24px;">أهلاً بك يا أرثر 👋</h1>
                        <p style="margin:5px 0 0 0; color:#9ca3af; font-size:14px;">إدارة سيرفر: <span style="color:#fff;">${guildName}</span></p>
                    </div>
                    <div>
                        <span class="badge">الحالة: متصل 24/7 🟢</span>
                        <span class="badge">البينج: ${botPing}ms</span>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-card"><h3>أعضاء السيرفر</h3><p>${memberCount}</p></div>
                    <div class="stat-card"><h3>سرعة البوت</h3><p>${botPing}ms</p></div>
                    <div class="stat-card"><h3>رتبة البوت</h3><p>Admin</p></div>
                    <div class="stat-card"><h3>الوضع</h3><p style="color:#10b981;">مستقر</p></div>
                </div>

                <div class="panel-section">
                    <h2>🛠️ إنشاء رومات جديدة في السيرفر</h2>
                    <form action="/create-room" method="POST">
                        <input type="text" name="roomName" placeholder="أدخل اسم الروم (مثال: روقان-وسوالف)" required>
                        <button type="submit">➕ إنشاء روم كتابي وصوتي</button>
                    </form>
                </div>
            </div>
        </body>
        </html>
    `);
});

app.post('/create-room', async (req, res) => {
    const roomName = req.body.roomName;
    const guild = client.guilds.cache.first();
    if (guild && roomName) {
        try {
            await guild.channels.create({ name: roomName, type: ChannelType.GuildText });
            await guild.channels.create({ name: roomName, type: ChannelType.GuildVoice });
            return res.send(`<script>alert('تم إنشاء الرومات بنجاح!'); window.location.href='/';</script>`);
        } catch (err) {
            return res.send(`<script>alert('حدث خطأ.'); window.location.href='/';</script>`);
        }
    }
    res.redirect('/');
});

app.listen(PORT, () => console.log(`Dashboard active on port ${PORT}`));

client.once('ready', async () => {
    console.log(`Bot logged in as ${client.user.tag}!`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commandsArray });
    } catch (error) {}
});

// التعامل مع أوامر السلاش العادية
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        await interaction.reply({ content: 'حدث خطأ!', ephemeral: true });
    }
});

// 🤖 هنا الشات التلقائي بدون سلاشات في أي روم اسمه "ai-chat" أو "سوالف"
client.on('messageCreate', async message => {
    if (message.author.bot) return; // لا ترد على البوتات نفسها

    // تحقق إذا كان اسم الروم يحتوي على كلمة "ai-chat" أو "سوالف"
    if (message.channel.name.includes('ai-chat') || message.channel.name.includes('سوالف')) {
        const username = message.author.username;
        const userMessage = message.content;

        // إظهار علامة "جاري الكتابة..."
        await message.channel.sendTyping();

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `المستخدم الذي يكلمك الآن في السيرفر هو ${username} (وهو جزء من سيرفر Arthur و Joud الخاص). رد عليه بلغة لطيفة وودودة وبدون تكلف: ${userMessage}`,
            });

            const replyText = response.text || "هلا والله، ما فهمت قصدك زين؟";
            
            if (replyText.length > 2000) {
                return message.reply(replyText.substring(0, 1999));
            }

            await message.reply(replyText);
        } catch (error) {
            console.error(error);
            await message.reply('❌ صار فيه مشكلة بالاتصال بالذكاء الاصطناعي.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
