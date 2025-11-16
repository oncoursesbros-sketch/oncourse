import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Роуты
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import courseRoutes from './routes/courses.js';
import cartRoutes from './routes/cart.js';
import paymentRoutes from './routes/payment.js';
import quizRoutes from './routes/quiz.js';
import testRoutes from './routes/test.js';
import profileRoutes from './routes/profile.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Проверка и создание папок
const uploadsDir = path.join(__dirname, 'uploads');
const videosDir = path.join(__dirname, 'videos'); // Новая папка для видео

[uploadsDir, videosDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Папка ${path.basename(dir)} создана`);
  } else {
    console.log(`📁 Папка ${path.basename(dir)} существует`);
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// ✅ ПРАВИЛЬНАЯ НАСТРОЙКА СТАТИЧЕСКИХ ФАЙЛОВ ДЛЯ ВИДЕО
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    // Устанавливаем правильные заголовки для видео
    if (path.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
    }
  }
}));

app.use('/videos', express.static(path.join(__dirname, 'videos'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      // Разрешаем кеширование видео
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// Middleware для обработки range-запросов (для потокового видео)
app.use('/videos', (req, res, next) => {
  if (req.headers.range) {
    const videoPath = path.join(__dirname, 'videos', req.path);
    
    if (fs.existsSync(videoPath)) {
      const videoSize = fs.statSync(videoPath).size;
      const range = req.headers.range;
      
      if (range) {
        const CHUNK_SIZE = 10 ** 6; // 1MB
        const start = Number(range.replace(/\D/g, ""));
        const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
        const contentLength = end - start + 1;
        
        const headers = {
          "Content-Range": `bytes ${start}-${end}/${videoSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": contentLength,
          "Content-Type": "video/mp4",
        };
        
        res.writeHead(206, headers);
        const videoStream = fs.createReadStream(videoPath, { start, end });
        videoStream.pipe(res);
        return;
      }
    }
  }
  next();
});

// Логирование запросов к статическим файлам
app.use(['/uploads', '/videos'], (req, res, next) => {
  console.log('📁 Статический файл запрошен:', req.path);
  next();
});

// Логирование всех запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Роуты
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/test', testRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Сервер работает нормально',
    timestamp: new Date().toISOString(),
    uploadsPath: uploadsDir,
    videosPath: videosDir
  });
});

// Роут для проверки доступности видео
app.get('/api/videos/check', (req, res) => {
  const videos = [];
  
  // Проверяем папку videos
  if (fs.existsSync(videosDir)) {
    const videoFiles = fs.readdirSync(videosDir).filter(file => 
      file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.ogg')
    );
    
    videoFiles.forEach(file => {
      const filePath = path.join(videosDir, file);
      const stats = fs.statSync(filePath);
      videos.push({
        name: file,
        path: `/videos/${file}`,
        size: stats.size,
        url: `http://localhost:${PORT}/videos/${file}`
      });
    });
  }
  
  res.json({
    videosAvailable: videos.length,
    videos: videos,
    videosDirectory: videosDir
  });
});

// 404 - Обработка несуществующих маршрутов
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Маршрут не найден',
    path: req.originalUrl,
    method: req.method
  });
});

// Обработка ошибок
app.use((error, req, res, next) => {
  console.error('❌ Ошибка сервера:', error);
  res.status(500).json({ 
    message: 'Внутренняя ошибка сервера',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📚 Online Courses Platform`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log(`📁 Статические файлы: ${uploadsDir}`);
  console.log(`🎥 Видео файлы: ${videosDir}`);
  console.log(`🌐 Клиент: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  console.log(`📹 Проверь видео: http://localhost:${PORT}/api/videos/check`);
});