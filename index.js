const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder, ChannelType } = require('discord.js');
const express = require('express');
const dotenv = require('dotenv');

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

const app = express();
const PORT = process.env.PORT || 3000;

// دعم قراءة بيانات الـ POST من الداشبورد
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const OWNER_ID = process.env.OWNER_ID || ""; 
const VOICE_CHANNEL_ID = process.env.CHANNEL_ID || "";

// تصميم لوحة التحكم (Dashboard) الفخمة الخاصة بك
app.get('/', (req, res) => {
    const guild = client.guilds.cache.first();
    const guildName = guild ? guild.name : "Arthur's Server";
    const memberCount = guild ? guild.memberCount : 2;
    const botPing = client.ws.ping;

    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>ND • ARTHUR BOT - Control Center</title>
            <style>
                body { background: #0f172a; color: #f8fafc; font-family: 'Tahoma', sans-serif; text-align: center; padding: 30px; margin: 0; }
                .container { max-width: 700px; margin: auto; background: #1e293b; padding: 30px; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155; }
                h1 { color: #38bdf8; margin-bottom: 10px; }
                .status-box { background: #0f172a; padding: 15px; border-radius: 8px; margin: 20px 0; display: flex; justify-content: space-around; border: 1px solid #475569; }
                .statItem span { color: #34d399; font-weight: bold; }
                .btn-group { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 25px; }
                button, .btn { background: #6366f1; color: white; border: none; padding: 12px 20px; border-radius: 8px; font-size: 16px; cursor: pointer; transition: 0.2s; font-weight: bold; text-decoration: none; display: inline-block; }
                button:hover, .btn:hover { background: #4f46e5; transform: translateY(-2px); }
                .danger { background: #ef4444; }
                .danger:hover { background: #dc2626; }
                input { padding: 10px; width: 70%; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: white; margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🤖 ND • ARTHUR BOT</h1>
                <p>لوحة التحكم المركزية الخاصة بمالك السيرفر (Arthur)</p>
                
                <div class="status-box">
                    <div>الحالة: <span style="color:#22c55e;">متصل 24/7 🟢</span></div>
                    <div>السيرفر: <span>${guildName}</span></div>
                    <div>الأعضاء: <span>${memberCount}</span></div>
                    <div>البينج: <span>${botPing}ms</span></div>
                </div>

                <hr style="border:0; border-top:1px solid #334155; margin: 20px 0;">

                <h3>⚙️ إدارة ورتّب السيرفر مباشرة من الموقع:</h3>
                <form action="/create-room" method="POST" style="margin-top: 15px;">
                    <input type="text" name="roomName" placeholder="أدخل اسم الروم الجديد (مثال: سوالف-خاصة)" required><br>
                    <button type="submit">➕ إنشاء روم كتابي وصوتي</button>
                </form>

                <div class="btn-group">
                    <form action="/clear-chat" method="POST">
                        <button type="submit" class="danger">🧹 مسح رسائل الشات العام</button>
                    </form>
                    <a href="/" class="btn">🔄 تحديث البيانات</a>
                </div>
            </div>
        </body>
        </html>
    `);
});

// استقبال أمر إنشاء الرومات من الداشبورد
app.post('/create-room', async (req, res) => {
    const roomName = req.body.roomName;
    const guild = client.guilds.cache.first();
    if (guild && roomName) {
        try {
            // إنشاء روم كتابي
            await guild.channels.create({
                name: roomName,
                type: ChannelType.GuildText,
            });
            // إنشاء روم صوتي
            await guild.channels.create({
                name: roomName,
                type: ChannelType.GuildVoice,
            });
            return res.send(`<script>alert('تم إنشاء الرومات بنجاح في السيرفر!'); window.location.href='/';</script>`);
        } catch (err) {
            console.error(err);
            return res.send(`<script>alert('حدث خطأ أثناء إنشاء الرومات.'); window.location.href='/';</script>`);
        }
    }
    res.redirect('/');
});

// مسح الشات من الموقع
app.post('/clear-chat', async (req, res) => {
    const guild = client.guilds.cache.first();
    if (guild) {
        const defaultChannel = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me).has('ManageMessages'));
        if (defaultChannel) {
            await defaultChannel.bulkDelete(20, true).catch(() => {});
        }
    }
    res.redirect('/');
});

app.listen(PORT, () => console.log(`Dashboard active on port ${PORT}`));

// --- تسجيل الأوامر وأحداث ديسكورد ---
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('فحص سرعة استجابة البوت'),
    new SlashCommandBuilder().setName('profile').setDescription('عرض بطاقة بروفايلك والرتبة الخاصة'),
    new SlashCommandBuilder().setName('help').setDescription('عرض قائمة الأوامر والمساعدة'),
    new SlashCommandBuilder().setName('كت').setDescription('سؤال كت تويت عشوائي وممتع'),
    new SlashCommandBuilder().setName('صراحة').setDescription('سؤال صراحة وجريء لفتح السوالف'),
    new SlashCommandBuilder().setName('لطيف').setDescription('كلمة أو عبارة لطيفة تروق المزاج'),
    new SlashCommandBuilder().setName('لغز').setDescription('حل اللغز واختبر ذكاءك'),
    new SlashCommandBuilder().setName('رياضيات').setDescription('تحدي العمليات الحسابية السريعة'),
    new SlashCommandBuilder().setName('عقاب').setDescription('عقاب عشوائي خفيف'),
    new SlashCommandBuilder().setName('نکته').setDescription('اضحك مع نكتة جديدة'),
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('مسح عدد معين من الرسائل')
        .addIntegerOption(option => option.setName('amount').setDescription('عدد الرسائل').setRequired(true)),
    new SlashCommandBuilder().setName('owner-panel').setDescription('لوحة التحكم الخاصة بمالك البوت فقط')
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('🌐 Dashboard Active | /help');

    if (VOICE_CHANNEL_ID) {
        const channel = await client.channels.fetch(VOICE_CHANNEL_ID).catch(() => null);
        if (channel && channel.isVoiceBased()) {
            try {
                const { joinVoiceChannel } = require('@discordjs/voice');
                joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                    selfDeaf: false,
                    selfMute: true
                });
            } catch (error) {}
        }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully registered all Master Bot commands globally!');
    } catch (error) {}
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'ping') return interaction.reply({ content: `🏓 Pong: **${client.ws.ping}ms**`, ephemeral: true });
    
    if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setColor('#7c3aed')
            .setTitle('📜 قائمة أوامر ND • ARTHUR BOT')
            .setDescription('أوامر السوالف والداشبورد:')
            .addFields(
                { name: '☕ ألعاب وونسة', value: '`/كت` - `/صراحة` - `/لطيف` - `/لغز` - `/رياضيات` - `/عقاب` - `/نکته`', inline: false },
                { name: '🌐 لوحة التحكم (Dashboard)', value: 'افتح رابط ريندر الخاص بك في المتصفح لتعديل وإنشاء رومات السيرفر مباشرة!', inline: false }
            );
        return interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }

    if (commandName === 'كت') {
        const cut = ['لو عندك قدرة تمسح موقف محرج من ذاكرة الشخص الثاني، وش بيكون؟', 'أكثر صفه تعجبك في الشخص اللي جالس معك الحين؟'][Math.floor(Math.random() * 2)];
        return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ff7675').setTitle('🎯 كت تويت').setDescription(cut)] });
    }

    if (commandName === 'صراحة') {
        const truth = ['متى آخر مرة ضحكت من قلبك بسبب شخص معك بالسيرفر؟', 'وش أكثر كلمة يقولها وتترك أثر حلو في خاطرك؟'][Math.floor(Math.random() * 2)];
        return interaction.reply({ embeds: [new EmbedBuilder().setColor('#e84393').setTitle('💬 صراحة').setDescription(truth)] });
    }

    if (commandName === 'لطيف') {
        const sweet = ['✨ "وجود الأشخاص اللطيفين بحياتنا يخلي الأيام أبسط وأجمل بكثير."', '☕ "روقان القعدة مع ناس تفهمك يسوى الدنيا وما فيها!"'][Math.floor(Math.random() * 2)];
        return interaction.reply({ embeds: [new EmbedBuilder().setColor('#00b894').setTitle('🍃 لقطة لطيفة').setDescription(sweet)] });
    }

    if (commandName === 'لغز') {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor('#fdcb6e').setTitle('🧩 لغز').setDescription('ما هو الشيء الذي يرفع شيئاً ثقيلاً ومع ذلك لا يقدر على مسمار؟ (البحر)')] });
    }

    if (commandName === 'رياضيات') {
        const n1 = Math.floor(Math.random() * 10) + 1, n2 = Math.floor(Math.random() * 10) + 1;
        return interaction.reply({ embeds: [new EmbedBuilder().setColor('#0984e3').setTitle('🧮 رياضيات').setDescription(`كم الناتج: **${n1} × ${n2}**؟`)] });
    }

    if (commandName === 'عقاب') {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor('#d63031').setTitle('🎲 عقاب').setDescription('عقابك: تعترف بشيء جميل تحبه في الطرف الثاني!')] });
    }

    if (commandName === 'نکته') {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor('#e17055').setTitle('😂 نكتة').setDescription('واحد يزرع مسمار بالارض ليش؟ يبي يطلع شجرة سياكل!')] });
    }

    if (commandName === 'clear') {
        if (!interaction.member.permissions.has('ManageMessages')) return interaction.reply({ content: '❌ ليس لديك صلاحية!', ephemeral: true });
        const amount = interaction.options.getInteger('amount');
        await interaction.channel.bulkDelete(amount, true).catch(() => {});
        return interaction.reply({ content: `🧹 تم مسح ${amount} رسالة.`, ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
