# Studiness (frontend only)

এটি একটি static web app। কোনো server, Firebase বা Supabase লাগে না। সব ডেটা browser-এর localStorage-এ থাকে।

## ফাইল
- index.html: সব screen (splash, landing, login/register, main, timer, planner, stats)
- style.css: design
- config.js: Google Form-এর link ও entry ID
- app.js: সব logic
- README.md: এই নির্দেশনা

## GitHub-এ host করা
1. GitHub-এ নতুন repository বানান (যেমন `studiness`, Public)।
2. এই ৫টি ফাইল একই level-এ upload করুন (কোনো sub-folder নয়)।
3. Settings > Pages > Source: "Deploy from a branch", Branch: `main`, Folder: `/ (root)`, Save করুন।
4. কিছুক্ষণ পরে `https://<username>.github.io/studiness/` লিংকে সাইট চালু হবে।
5. Hostinger subdomain চাইলে DNS-এ CNAME রেকর্ড যোগ করুন: name `app`, target `<username>.github.io`। তারপর GitHub Pages সেটিংসে Custom domain হিসেবে `app.yourdomain.com` লিখুন।

## Google Form দিয়ে login tracking
Login/Register হলে অ্যাপ Google Form-এ একটি রেকর্ড পাঠায়, যাতে আপনি দেখতে পান কে কখন ঢুকেছে।

1. Google Forms-এ নতুন form বানান। Title: "Studiness Activity"।
2. চারটি প্রশ্ন বানান (সব Short answer):
   - event
   - name
   - email
   - time
3. Form-এর ⋮ মেনুতে "Get pre-filled link" চাপুন। প্রতিটি প্রশ্নে কিছু লিখে "Get link" করুন। লিংকের ভেতরে `entry.XXXXXXXX=...` অংশ দেখবেন। প্রতিটি প্রশ্নের entry ID নোট করুন।
6. Send চাপুন, link icon থেকে লিংক কপি করুন। লিংকের `viewform` অংশ `formResponse` দিয়ে বদলান। এটি `LOGIN_FORM_ACTION` হবে।
7. `config.js`-এ `LOGIN_FORM_ACTION` ও চারটি entry ID বসান।
8. Responses ট্যাবে সব login/register দেখতে পাবেন। Spreadsheet-এ link করলে সহজে গোনা যায়।

## Feedback form
1. আরেকটি Google Form বানান, নাম "Studiness Feedback"।
2. প্রশ্নগুলো এমন হতে পারে:
   - আপনার নাম (ঐচ্ছিক)
   - কোন feature সবচেয়ে ভালো লেগেছে?
   - কোন অংশ বুঝতে অসুবিধা হয়েছে?
   - কোন feature সবচেয়ে দরকার মনে হয়?
   - কোন bug পেয়েছেন? (Device ও browser লিখুন)
   - আর কিছু বলার আছে?
3. Send > link থেকে `viewform` লিংক কপি করে `config.js`-এর `FEEDBACK_FORM_URL`-এ বসান। Header ও landing page-এর "Feedback" লিংক সেখানে যাবে।

## জানা সীমাবদ্ধতা
- ডেটা শুধু যেই browser-এ কাজ করা হয়েছে সেখানে থাকে। আলাদা ফোন বা browser-এ login করলে আগের ডেটা দেখা যাবে না।
- Browser-এর data মুছে ফেললে সব ডেটা চলে যাবে।
- Password browser-এ SHA-256 hash করে রাখা হয়। এটি শেখার ও ছোট ব্যবহারের জন্য যথেষ্ট, কিন্তু শক্তিশালী নিরাপত্তা নয়। Public-এ বড় পরিসরে ছাড়ার আগে backend দরকার।
- Google Form শুধু login/register রেকর্ড করে। Study ডেটা (session, progress) form-এ যায় না।
- Password hash-এর জন্য https বা localhost লাগে। GitHub Pages https-এ চলে, তাই সমস্যা হবে না।
- Timer চলাকালীন browser বন্ধ থাকলে timer ফিরে আসার সময় হিসাব করে session সংরক্ষিত হয়।
- Mock test এখনো "Coming soon"।
