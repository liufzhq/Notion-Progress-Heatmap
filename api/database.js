import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

export default async (req, res) => {
  const token = process.env.ENV_NOTION_TOKEN;
  const databaseId = process.env.ENV_DATABASE_ID;
  // 这里填"所属项目"里关联的那个项目页面的 ID（去掉横线后比较）
  const projectId = req.query.habit ? req.query.habit.replace(/-/g, "") : null;

  try {
    const response = await fetch(`{{https://api.notion.com/v1/databases/${databaseId}}}/query`, {
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

    const processedData = processData(data.results, projectId);
    res.json(processedData);
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: error.message });
  }
};

const processData = (data, projectId) => {
  const progressMap = new Map();

  data.forEach(item => {
    if (item.properties.Date && item.properties.Progress) {
      // 如果指定了项目 ID，只保留"所属项目"里包含该 ID 的记录
      if (projectId) {
        const relations = (item.properties["所属项目"] && item.properties["所属项目"].relation) || [];
        const matched = relations.some(r => r.id.replace(/-/g, "") === projectId);
        if (!matched) return;
      }

      if (item.properties.Progress.formula.number !== null && item.properties.Progress.formula.number > 0) {
        const dateObject = new Date(item.properties.Date.created_time);
        dateObject.setDate(dateObject.getDate() + 1);
        const date = dateObject.toISOString().split('T')[0];
        const progress = Math.round(item.properties.Progress.formula.number * 100);
        progressMap.set(date, progress);
      }
    }
  });

  return Array.from(progressMap).map(([date, progress]) => ({ date, progress }));
};
