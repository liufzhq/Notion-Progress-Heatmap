import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

export default async (req, res) => {
  const token = process.env.ENV_NOTION_TOKEN;
  const databaseId = process.env.ENV_DATABASE_ID;
  // 用任务名过滤，例如 ?habit=背点单词
  const habit = req.query.habit ? req.query.habit.trim() : null;

  try {
    const url = 'https://api.notion.com/v1/databases/' + databaseId + '/query';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2021-05-13',
        'Content-Type': 'application/json'
      },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status} ${JSON.stringify(data)}`);
    }

    const processedData = processData(data.results, habit);
    res.json(processedData);
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: error.message });
  }
};

const processData = (data, habit) => {
  const progressMap = new Map();

  data.forEach(item => {
    if (item.properties.Date && item.properties.Progress) {
      // 按任务名过滤（指定了 habit 时）
      if (habit) {
        const titleArr = item.properties["每日任务"] && item.properties["每日任务"].title;
        const title = (titleArr && titleArr[0] ? titleArr[0].plain_text : "").trim();
        if (title !== habit) return;
      }

      if (item.properties.Progress.formula.number !== null && item.properties.Progress.formula.number > 0) {
        const dateObject = new Date(item.properties.Date.created_time);
        const date = dateObject.toISOString().split('T')[0];
        const progress = Math.round(item.properties.Progress.formula.number * 100);
        progressMap.set(date, progress);
      }
    }
  });

  return Array.from(progressMap).map(([date, progress]) => ({ date, progress }));
};
