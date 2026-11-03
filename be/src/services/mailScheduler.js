const mailService = require('./mailService');

let lastDailyRunDate = null;
let isJobRunning = false;

// Starts background interval to check 9:00 AM daily lead reminders and process retries
function startMailScheduler() {
  console.log('⏰ Mail Scheduler initialized (Checking daily at 09:00 AM for lead reminders and error retries)');

  // Run check every 60 seconds
  setInterval(async () => {
    if (isJobRunning) return;
    isJobRunning = true;

    try {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${hours}:${minutes}`;
      const todayDateStr = now.toISOString().split('T')[0];

      const settings = await mailService.getMailSettings();
      const targetTime = settings.daily_reminder_time || '09:00';

      // Check if it's 09:00 AM (or configured time) and hasn't run today
      if (currentTimeStr === targetTime && lastDailyRunDate !== todayDateStr) {
        console.log(`⏰ [${currentTimeStr}] Running morning 9:00 AM lead visit & closing date email digest...`);
        lastDailyRunDate = todayDateStr;
        const res = await mailService.checkAndSendDailyLeadReminders();
        console.log('✅ Daily lead digest completed:', res);
      }

      // Automatically retry pending failed emails that haven't reached 3 attempts
      await mailService.retryAllPending();
    } catch (err) {
      console.error('Mail Scheduler error:', err.message);
    } finally {
      isJobRunning = false;
    }
  }, 60000);
}

module.exports = { startMailScheduler };
