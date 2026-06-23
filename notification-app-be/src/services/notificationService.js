const axios = require('axios');
const { getTopK } = require('../algorithms/priorityQueue');

const WEIGHTS = {
  placement: 3,
  result: 2,
  event: 1
};

async function Log(service, level, message) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), service, level, message }));
}

async function fetchExternalNotifications() {
  await Log('notification-service', 'info', 'Fetching notifications from external API');
  
  const baseURL = process.env.EVALUATION_SERVICE_URL || 'http://4.224.186.213/evaluation-service/notifications';
  const token = process.env.EXTERNAL_API_TOKEN 

  const response = await axios.get(baseURL, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 5000
  });

  return response.data?.data || [];
}

function calculateScore(notification) {
  const weight = WEIGHTS[notification.type.toLowerCase()] || 0;
  const createdDate = new Date(notification.createdAt);
  const ageInMinutes = Math.floor((Date.now() - createdDate.getTime()) / 60000);
  
  return (weight * 1000) - Math.max(0, ageInMinutes);
}

async function getRawNotifications() {
  return await fetchExternalNotifications();
}

async function getTopPriorityNotifications(k = 10) {
  await Log('notification-service', 'info', `Calculating top ${k} priority notifications`);
  
  const rawNotifications = await fetchExternalNotifications();
  
  const scoredNotifications = rawNotifications.map(notif => ({
    ...notif,
    priorityScore: calculateScore(notif)
  }));

  const topK = getTopK(scoredNotifications, k);
  
  await Log('notification-service', 'info', `Returning top ${topK.length} notifications`);
  return topK;
}

module.exports = { getRawNotifications, getTopPriorityNotifications };
