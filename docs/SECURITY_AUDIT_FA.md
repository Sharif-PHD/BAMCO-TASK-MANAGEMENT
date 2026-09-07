# گزارش امنیت و کارایی Release نهایی BAMCO

تاریخ بررسی: ۱۴۰۵/۰۶/۱۶

## نتیجه تست کد

- هیچ کلید `service_role`، کلید Secret یا Private Key در فایل‌های Release وجود ندارد.
- کلید سمت مرورگر از نوع Publishable است و دسترسی واقعی توسط RLS کنترل می‌شود.
- استفاده از `eval` و `document.write` در Release مشاهده نشد.
- تمام Assetهای محلی موجود و بدون ارجاع تکراری هستند.
- ماژول تقویم و گانت دقیقاً یک‌بار و بدون Boot تأخیری بارگذاری می‌شود.
- تمام فایل‌های JavaScript از بررسی Syntax عبور کردند.

## نتیجه بررسی Supabase

- RLS روی هر ۲۳ جدول Schema عمومی فعال است.
- سه Foreign Key بدون Index اصلاح شدند:
  - `change_request_events.actor_id`
  - `change_request_events.request_id`
  - `task_field_options.created_by`
- هیچ Migration مخرب یا تغییر Policy در این Release انجام نشد.

## هشدارهای تنظیماتی باقی‌مانده

1. محافظت از رمزهای افشاشده در Supabase Auth غیرفعال است و باید از تنظیمات Auth فعال شود.
2. افزونه `citext` در Schema عمومی نصب شده است. انتقال آن نیازمند تست وابستگی‌ها در محیط Staging است و در این Release جابه‌جا نشد.

## فرمان تست Release

```bash
node scripts/build-clean-release.mjs
node tests/data-io.test.mjs
node tests/security-release.test.mjs
```
