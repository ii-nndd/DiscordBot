const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder } = require('discord.js');
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

app.get('/', (req, res) => {
    res.send(`
        <html style="background:#0f172a; color:#f8fafc; font-family:sans-serif; text-align:center; padding-top:50px;">
            <h1>🤖 ND • ARTHUR BOT - Master Dashboard</h1>
            <p>Status: <span style="color:#22c55e;">Online & Operational 24/7</span></p>
            <p>Games Suite & Moderation: Active</p>
            <p>Owned by Arthur</p>
        </html>
    `);
});

app.listen(PORT, () => console.log(`Dashboard active on port ${PORT}`));

const OWNER_ID = process.env.OWNER_ID || ""; 
const VOICE_CHANNEL_ID = process.env.CHANNEL_ID || "";

// تسجيل الأوامر الشاملة (بدون الموسيقى)
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('فحص سرعة استجابة البوت'),
    new SlashCommandBuilder().setName('profile').setDescription('عرض بطاقة بروفايلك والستريك الخاص بك'),
    // الألعاب الفردية والمرح
    new SlashCommandBuilder().setName('كت').setDescription('سؤال كت تويت عشوائي وممتع'),
    new SlashCommandBuilder().setName('لغز').setDescription('حل اللغز واختبر ذكاءك'),
    new SlashCommandBuilder().setName('رياضيات').setDescription('تحدي العمليات الحسابية السريعة'),
    new SlashCommandBuilder().setName('عقاب').setDescription('عقاب عشوائي للمتحدي'),
    new SlashCommandBuilder().setName('نکته').setDescription('اضحك مع نكتة جديدة'),
    // أوامر الإدارة
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('مسح عدد معين من الرسائل (أدمن)')
        .addIntegerOption(option => option.setName('amount').setDescription('عدد الرسائل').setRequired(true)),
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('حظر عضو من السيرفر (أدمن)')
        .addUserOption(option => option.setName('target').setDescription('العضو المراد حظره').setRequired(true)),
    new SlashCommandBuilder().setName('owner-panel').setDescription('لوحة التحكم الخاصة بمالك البوت فقط')
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('🎮 Games Suite | ألعاب وتحديات');

    // الانضمام للبث الصوتي للبقاء متصلاً 24/7 (بدون موسيقى لتجنب المشاكل)
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
                console.log(`Successfully joined 24/7 voice channel: ${channel.name}`);
            } catch (error) {
                console.error('Failed to join voice channel:', error);
            }
        }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully registered all Master Bot commands globally!');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'ping') {
        return interaction.reply({ content: `🏓 Pong! WebSocket Latency: **${client.ws.ping}ms**`, ephemeral: true });
    }

    if (commandName === 'profile') {
        const userId = interaction.user.id;
        const isOwner = userId === OWNER_ID;

        const profileEmbed = new EmbedBuilder()
            .setColor(isOwner ? '#FFD700' : '#0099ff')
            .setTitle(`👤 البروفايل الشخصي: ${interaction.user.username}`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: '🔥 الستريك اليومي', value: `0 أيام`, inline: true },
                { name: '👑 الرتبة الخاصة', value: isOwner ? 'مالك البوت (Bot Owner VIP)' : 'عضو مجتمع', inline: true }
            )
            .setFooter({ text: 'ND • ARTHUR BOT' })
            .setTimestamp();

        return interaction.reply({ embeds: [profileEmbed] });
    }

    // الألعاب
    if (commandName === 'كت') {
        const cutTweets = [
            'لو عندك قدرة تمسح سنة من حياتك مقابل مليون دولار، توافق؟',
            'وش أكثر صفه تكرهها بالشخص اللي قدامك؟',
            'موقف محرج صار بحياتك وما تقدر تنساه؟',
            'لو خيروك بين العيش لوحدك في جزيرة أو مع شخص مزعج للأبد؟'
        ];
        const randomCut = cutTweets[Math.floor(Math.random() * cutTweets.length)];
        const embed = new EmbedBuilder().setColor('#ff7675').setTitle('🎯 كت تويت').setDescription(randomCut);
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'لغز') {
        const puzzles = [
            { q: 'ما هو الشيء الذي يرفع شيئاً ثقيلاً ومع ذلك لا يقدر على مسمار؟', a: 'البحر' },
            { q: 'حامل ومحمول نصفه ناشف ونصفه مبلول فمن يكون؟', a: 'السفينة' },
            { q: 'ما هو الشيء الذي يسير أمامك ولا تراه؟', a: 'الهواء' }
        ];
        const p = puzzles[Math.floor(Math.random() * puzzles.length)];
        const embed = new EmbedBuilder().setColor('#fdcb6e').setTitle('🧩 لعبة الألغاز').setDescription(p.q);
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'رياضيات') {
        const n1 = Math.floor(Math.random() * 12) + 1;
        const n2 = Math.floor(Math.random() * 12) + 1;
        const embed = new EmbedBuilder().setColor('#0984e3').setTitle('🧮 تحدي الرياضيات').setDescription(`كم الناتج السريع: **${n1} × ${n2}**؟`);
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'عقاب') {
        const punishments = [
            'عقابك: غيّر اسمك في الديسكورد إلى "متابع صامت" لمدة ساعة!',
            'عقابك: اكتب في شات السيرفر "أنا أسعد شخص في العالم" 3 مرات.',
            'عقابك: ممنوع تتحدث في الروم الصوتي لمدة 10 دقائق!'
        ];
        const p = punishments[Math.floor(Math.random() * punishments.length)];
        const embed = new EmbedBuilder().setColor('#d63031').setTitle('🎲 عقاب عشوائي').setDescription(p);
        return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'نکته') {
        const jokes = [
            'واحد يزرع مسمار بالارض ليش؟ يبي يطلع شجرة سياكل!',
            'محشش سألوه: وش رايك في الزواج المبكر؟ قال: يعني الساعة كم؟',
            'واحد غبي ضاع تلفونه، راح يبلغ الشرطة قالوا له الشرطة بنطلعه من تحت الأرض، قال: لا، أنا ضيعته فوق السطح!'
        ];
        const j = jokes[Math.floor(Math.random() * jokes.length)];
        const embed = new EmbedBuilder().setColor('#e17055').setTitle('😂 نكتة سريعة').setDescription(j);
        return interaction.reply({ embeds: [embed] });
    }

    // الإدارة
    if (commandName === 'clear') {
        if (!interaction.member.permissions.has('ManageMessages')) return interaction.reply({ content: '❌ ليس لديك صلاحية لإدارة الرسائل!', ephemeral: true });
        const amount = interaction.options.getInteger('amount');
        await interaction.channel.bulkDelete(amount, true).catch(() => {});
        return interaction.reply({ content: `🧹 تم مسح **${amount}** رسالة بنجاح.`, ephemeral: true });
    }

    if (commandName === 'ban') {
        if (!interaction.member.permissions.has('BanMembers')) return interaction.reply({ content: '❌ ليس لديك صلاحية لحظر الأعضاء!', ephemeral: true });
        const target = interaction.options.getUser('target');
        await interaction.guild.members.ban(target).catch(() => {});
        return interaction.reply({ content: `🔨 تم حظر العضو بنجاح من السيرفر.` });
    }

    if (commandName === 'owner-panel') {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: '🔒 هذا الأمر لمالك البوت فقط!', ephemeral: true });
        return interaction.reply({ content: '👑 أهلاً بك يا أرثر في لوحة تحكم المالك الخاصة!', ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
