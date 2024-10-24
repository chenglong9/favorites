import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// 设置模板引擎
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

// 正确设置静态文件中间件和MIME类型
app.use(express.static(join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// 获取网站元数据
async function getWebsiteMetadata(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const title = $('title').text() || $('meta[property="og:title"]').attr('content') || url;
    const favicon = $('link[rel="icon"]').attr('href') || 
                   $('link[rel="shortcut icon"]').attr('href') || 
                   new URL('/favicon.ico', url).href;
    
    return { title, favicon };
  } catch (error) {
    console.error(`Error fetching metadata for ${url}:`, error);
    return { title: url, favicon: '/default-favicon.png' };
  }
}

// 主路由
app.get('/', async (req, res) => {
  try {
    const data = JSON.parse(
      await fs.readFile(join(__dirname, 'data/websites.json'), 'utf-8')
    );

    // 为每个网站获取元数据
    for (const category of data.categories) {
      for (const site of category.sites) {
        site.title = site.description;
      }
    }
    res.render('index', { categories: data.categories });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});