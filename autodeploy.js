const { exec } = require('child_process');
const chokidar = require('chokidar');

console.log("================================================");
console.log("🚀 أداة الرفع التلقائي لـ Vercel تعمل الآن...");
console.log("👀 يتم الآن مراقبة أي تعديلات في الملفات...");
console.log("================================================\n");

let isDeploying = false;

// Initialize watcher
const watcher = chokidar.watch(['src/**/*', 'public/**/*'], {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  ignoreInitial: true
});

watcher.on('all', (event, path) => {
  if (isDeploying) return;
  
  console.log(`\n📝 تم اكتشاف تعديل في ملف: ${path}`);
  console.log("⏳ جاري رفع التعديلات أوتوماتيكياً إلى GitHub / Vercel...");
  
  isDeploying = true;
  
  exec('git add . && git commit -m "Auto update from VS Code" && git push origin main', (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ فشل الرفع: تأكد أنك سجلت الدخول في GitHub`);
      console.error(error.message);
    } else {
      console.log(`✅ تم الرفع بنجاح!`);
      console.log("🚀 جاري الآن تحديث موقعك على Vercel (سيستغرق دقيقة تقريباً).");
    }
    console.log("\n👀 في انتظار أي تعديلات جديدة...");
    
    setTimeout(() => {
      isDeploying = false;
    }, 8000); // Debounce time to avoid multiple triggers for the same save
  });
});
