const { SlashCommandBuilder } = require('discord.js');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('اسأل')
        .setDescription('اسأل الذكاء الاصطناعي وهو عارف أسماءكم وسوالفكم')
        .addStringOption(option => 
            option.setName('سؤالك')
                .setDescription('اكتب سؤالك أو موضوعك')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        
        const prompt = interaction.options.getString('سؤالك');
        const username = interaction.user.username;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `المستخدم الذي يكلمك الآن هو ${username} (جزء من سيرفر Arthur و Joud). أجب بلغة لطيفة وودودة: ${prompt}`,
            });

            const replyText = response.text || "عذراً، لم أستطع صياغة رد مناسب.";
            
            if (replyText.length > 2000) {
                return interaction.editReply(replyText.substring(0, 1999));
            }

            await interaction.editReply(replyText);
        } catch (error) {
            console.error("AI Error Details:", error);
            await interaction.editReply('❌ حدث خطأ داخلي أثناء محاولة الاتصال بالذكاء الاصطناعي.');
        }
    },
};
