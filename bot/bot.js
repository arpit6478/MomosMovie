const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const ADMIN_IDS = process.env.ADMIN_IDS.split(',').map(id => parseInt(id));
const WEBSITE_URL = process.env.WEBSITE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Store user sessions for movie addition flow
const userSessions = new Map();

// Check if user is admin
function isAdmin(userId) {
    return ADMIN_IDS.includes(userId);
}

// Start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isAdmin(userId)) {
        return bot.sendMessage(chatId, '⛔ Access Denied. Admin only bot.');
    }

    showMainMenu(chatId);
});

// Show main menu
function showMainMenu(chatId) {
    const keyboard = {
        reply_markup: {
            keyboard: [
                ['➕ Add Movie', '📊 Stats'],
                ['🗑 Delete Movie', 'ℹ️ Help']
            ],
            resize_keyboard: true
        }
    };

    bot.sendMessage(chatId, '🎬 *Momo\'s Movie Admin Panel*\n\nSelect an option:', {
        parse_mode: 'Markdown',
        ...keyboard
    });
}

// Handle menu selections
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (!isAdmin(userId)) return;

    // Check if user is in a session
    if (userSessions.has(userId)) {
        handleMovieAdditionFlow(msg);
        return;
    }

    switch (text) {
        case '➕ Add Movie':
            startAddMovie(chatId, userId);
            break;
        case '📊 Stats':
            await showStats(chatId);
            break;
        case '🗑 Delete Movie':
            await showDeleteMenu(chatId);
            break;
        case 'ℹ️ Help':
            showHelp(chatId);
            break;
        case '❌ Cancel':
            cancelOperation(chatId, userId);
            break;
        default:
            if (text && !text.startsWith('/')) {
                bot.sendMessage(chatId, 'Please use the menu buttons.');
            }
    }
});

// Start add movie flow
function startAddMovie(chatId, userId) {
    userSessions.set(userId, {
        step: 'title',
        data: {}
    });

    const keyboard = {
        reply_markup: {
            keyboard: [['❌ Cancel']],
            resize_keyboard: true
        }
    };

    bot.sendMessage(chatId, '📝 *Add New Movie*\n\nEnter movie title:', {
        parse_mode: 'Markdown',
        ...keyboard
    });
}

// Handle movie addition flow
async function handleMovieAdditionFlow(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    const photo = msg.photo;

    const session = userSessions.get(userId);
    if (!session) return;

    try {
        switch (session.step) {
            case 'title':
                if (!text) {
                    return bot.sendMessage(chatId, '❌ Please enter a valid title.');
                }
                session.data.title = text;
                session.step = 'poster';
                bot.sendMessage(chatId, '🖼 *Step 2/7*\n\nSend movie poster URL or upload an image:', {
                    parse_mode: 'Markdown'
                });
                break;

            case 'poster':
                if (photo) {
                    // Handle uploaded photo
                    const fileId = photo[photo.length - 1].file_id;
                    const fileUrl = await bot.getFileLink(fileId);
                    session.data.poster = fileUrl;
                } else if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
                    session.data.poster = text;
                } else {
                    return bot.sendMessage(chatId, '❌ Please provide a valid URL or upload an image.');
                }
                
                session.step = 'description';
                bot.sendMessage(chatId, '📄 *Step 3/7*\n\nEnter movie description:', {
                    parse_mode: 'Markdown'
                });
                break;

            case 'description':
                if (!text) {
                    return bot.sendMessage(chatId, '❌ Please enter a description.');
                }
                session.data.description = text;
                session.step = 'category';
                
                const categoryKeyboard = {
                    reply_markup: {
                        keyboard: [
                            ['🎬 Movie', '📺 Series'],
                            ['🎭 Drama', '❌ Cancel']
                        ],
                        resize_keyboard: true
                    }
                };
                
                bot.sendMessage(chatId, '🏷 *Step 4/7*\n\nSelect category:', {
                    parse_mode: 'Markdown',
                    ...categoryKeyboard
                });
                break;

            case 'category':
                const validCategories = ['🎬 Movie', '📺 Series', '🎭 Drama'];
                if (!validCategories.includes(text)) {
                    return bot.sendMessage(chatId, '❌ Please select a category from the buttons.');
                }
                
                session.data.category = text.replace(/[🎬📺🎭]/g, '').trim();
                session.step = 'quality';
                
                const qualityKeyboard = {
                    reply_markup: {
                        keyboard: [
                            ['4K Ultra HD', '1080p HD'],
                            ['720p HD', '480p SD'],
                            ['❌ Cancel']
                        ],
                        resize_keyboard: true
                    }
                };
                
                bot.sendMessage(chatId, '🎥 *Step 5/7*\n\nSelect quality:', {
                    parse_mode: 'Markdown',
                    ...qualityKeyboard
                });
                break;

            case 'quality':
                const validQualities = ['4K Ultra HD', '1080p HD', '720p HD', '480p SD'];
                if (!validQualities.includes(text)) {
                    return bot.sendMessage(chatId, '❌ Please select a quality from the buttons.');
                }
                
                session.data.quality = text;
                session.step = 'size';
                bot.sendMessage(chatId, '💾 *Step 6/7*\n\nEnter file size (e.g., 2.5GB, 800MB):', {
                    parse_mode: 'Markdown'
                });
                break;

            case 'size':
                if (!text) {
                    return bot.sendMessage(chatId, '❌ Please enter file size.');
                }
                session.data.size = text;
                session.step = 'link';
                bot.sendMessage(chatId, '🔗 *Step 7/7*\n\nEnter TeraBox link:', {
                    parse_mode: 'Markdown'
                });
                break;

            case 'link':
                if (!text || (!text.startsWith('http://') && !text.startsWith('https://'))) {
                    return bot.sendMessage(chatId, '❌ Please enter a valid URL.');
                }
                session.data.link = text;
                
                // Save movie
                await saveMovie(chatId, userId, session.data);
                break;
        }
    } catch (error) {
        console.error('Error in movie addition flow:', error);
        bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
        cancelOperation(chatId, userId);
    }
}

// Save movie to database
async function saveMovie(chatId, userId, movieData) {
    try {
        bot.sendMessage(chatId, '⏳ Saving movie to database...');

        const response = await axios.post(`${API_URL}/add-movie`, movieData);
        
        if (response.data.success) {
            const movie = response.data.data;
            
            // Post to Telegram channel
            await postToChannel(movie);
            
            bot.sendMessage(chatId, '✅ *Movie added successfully!*\n\n' +
                `Title: ${movie.title}\n` +
                `Category: ${movie.category}\n` +
                `Quality: ${movie.quality}\n` +
                `Size: ${movie.size}\n\n` +
                `View on website: ${WEBSITE_URL}/movie/${movie.id}`, {
                parse_mode: 'Markdown'
            });
        } else {
            throw new Error(response.data.error || 'Failed to save movie');
        }
    } catch (error) {
        console.error('Error saving movie:', error);
        bot.sendMessage(chatId, '❌ Failed to save movie: ' + error.message);
    } finally {
        userSessions.delete(userId);
        showMainMenu(chatId);
    }
}

// Post movie to Telegram channel
async function postToChannel(movie) {
    try {
        const caption = `🎬 *${movie.title}*\n\n` +
            `📝 ${movie.description}\n\n` +
            `🏷 Category: ${movie.category}\n` +
            `🎥 Quality: ${movie.quality}\n` +
            `💾 Size: ${movie.size}\n\n` +
            `🔗 *Watch Now:* ${WEBSITE_URL}/movie/${movie.id}`;

        await bot.sendPhoto(CHANNEL_ID, movie.poster, {
            caption: caption,
            parse_mode: 'Markdown'
        });

        console.log('Movie posted to channel successfully');
    } catch (error) {
        console.error('Error posting to channel:', error);
        throw error;
    }
}

// Show statistics
async function showStats(chatId) {
    try {
        const response = await axios.get(`${API_URL}/movies`);
        
        if (response.data.success) {
            const movies = response.data.data;
            
            const stats = {
                total: movies.length,
                movies: movies.filter(m => m.category === 'Movie').length,
                series: movies.filter(m => m.category === 'Series').length,
                drama: movies.filter(m => m.category === 'Drama').length
            };
            
            const message = `📊 *Movie Statistics*\n\n` +
                `📽 Total Content: ${stats.total}\n` +
                `🎬 Movies: ${stats.movies}\n` +
                `📺 Series: ${stats.series}\n` +
                `🎭 Drama: ${stats.drama}\n\n` +
                `🌐 Website: ${WEBSITE_URL}`;
            
            bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
        bot.sendMessage(chatId, '❌ Failed to fetch statistics.');
    }
}

// Show delete menu
async function showDeleteMenu(chatId) {
    try {
        const response = await axios.get(`${API_URL}/movies`);
        
        if (response.data.success && response.data.data.length > 0) {
            const movies = response.data.data.slice(0, 10); // Show latest 10
            
            const inlineKeyboard = {
                reply_markup: {
                    inline_keyboard: movies.map(movie => ([{
                        text: `🗑 ${movie.title} (${movie.category})`,
                        callback_data: `delete_${movie.id}`
                    }]))
                }
            };
            
            bot.sendMessage(chatId, '🗑 *Select movie to delete:*', {
                parse_mode: 'Markdown',
                ...inlineKeyboard
            });
        } else {
            bot.sendMessage(chatId, '📭 No movies found in database.');
        }
    } catch (error) {
        console.error('Error fetching movies for deletion:', error);
        bot.sendMessage(chatId, '❌ Failed to fetch movies.');
    }
}

// Handle delete callback
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (!isAdmin(userId)) {
        return bot.answerCallbackQuery(query.id, { text: 'Access Denied' });
    }

    if (data.startsWith('delete_')) {
        const movieId = data.replace('delete_', '');
        
        try {
            const response = await axios.delete(`${API_URL}/movie/${movieId}`);
            
            if (response.data.success) {
                bot.answerCallbackQuery(query.id, { text: '✅ Movie deleted successfully!' });
                bot.editMessageText('✅ Movie has been deleted.', {
                    chat_id: chatId,
                    message_id: query.message.message_id
                });
            }
        } catch (error) {
            console.error('Error deleting movie:', error);
            bot.answerCallbackQuery(query.id, { text: '❌ Failed to delete movie' });
        }
    }
});

// Show help
function showHelp(chatId) {
    const helpText = `ℹ️ *Help & Information*\n\n` +
        `*Commands:*\n` +
        `/start - Show main menu\n\n` +
        `*Features:*\n` +
        `➕ Add Movie - Add new movie to database\n` +
        `📊 Stats - View movie statistics\n` +
        `🗑 Delete Movie - Remove movie from database\n\n` +
        `*Website:* ${WEBSITE_URL}\n` +
        `*Channel:* ${CHANNEL_ID}`;
    
    bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
}

// Cancel operation
function cancelOperation(chatId, userId) {
    userSessions.delete(userId);
    bot.sendMessage(chatId, '❌ Operation cancelled.');
    showMainMenu(chatId);
}

// Error handling
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

console.log('🤖 Telegram Bot is running...');
