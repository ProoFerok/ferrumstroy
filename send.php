<?php
/**
 * Обработчик формы заявки сайта ООО «Феррум Строй».
 *
 * Принимает POST из формы на index.html, проверяет согласие на обработку ПДн
 * (152-ФЗ), отсекает спам (honeypot + минимальная валидация), отправляет
 * уведомление на e-mail и (опционально) в Telegram, сохраняет заявку в файл
 * на сервере (данные остаются на территории РФ при российском хостинге).
 *
 * Отвечает JSON при AJAX-отправке и корректно работает без JavaScript
 * (в этом случае показывает простую страницу-подтверждение).
 *
 * ── ЧТО НАСТРОИТЬ ПЕРЕД ПУБЛИКАЦИЕЙ ──────────────────────────────────────
 *   1. $TO_EMAIL           — куда присылать заявки.
 *   2. $FROM_EMAIL         — адрес-отправитель на вашем домене.
 *   3. (необязательно) $TELEGRAM_BOT_TOKEN и $TELEGRAM_CHAT_ID — дубль в Telegram.
 * Остальное менять не нужно.
 * ─────────────────────────────────────────────────────────────────────────
 */

// ── Настройки ────────────────────────────────────────────────────────────
$TO_EMAIL   = 'mail@example.ru';                 // TODO: ваш e-mail для заявок
$FROM_EMAIL = 'site@example.ru';                 // TODO: адрес-отправитель на вашем домене
$SUBJECT    = 'Заявка с сайта ferrumstroy';

$TELEGRAM_BOT_TOKEN = '';   // необязательно: токен бота от @BotFather
$TELEGRAM_CHAT_ID   = '';   // необязательно: ваш chat_id / id канала

$LEADS_DIR = __DIR__ . '/leads';   // сюда пишется журнал заявок (закрыт от веб-доступа)

// ── Утилиты ──────────────────────────────────────────────────────────────
$isAjax = (
  isset($_SERVER['HTTP_X_REQUESTED_WITH']) &&
  strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest'
) || (
  isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false
);

function respond($ok, $message, $isAjax, $code = 200) {
  http_response_code($code);
  if ($isAjax) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
  } else {
    header('Content-Type: text/html; charset=utf-8');
    $title = $ok ? 'Заявка отправлена' : 'Ошибка';
    echo "<!DOCTYPE html><html lang=ru><head><meta charset=utf-8>"
       . "<meta name=viewport content='width=device-width, initial-scale=1'>"
       . "<title>$title — Феррум Строй</title>"
       . "<style>body{font-family:system-ui,sans-serif;max-width:520px;margin:12vh auto;"
       . "padding:0 20px;color:#1d1f20;line-height:1.6}a{color:#416180}</style></head><body>"
       . "<h1>$title</h1><p>" . htmlspecialchars($message, ENT_QUOTES, 'UTF-8') . "</p>"
       . "<p><a href='index.html'>← Вернуться на сайт</a></p></body></html>";
  }
  exit;
}

function clean($v, $max = 500) {
  $v = is_string($v) ? trim($v) : '';
  $v = str_replace(["\r", "\n", "\t"], ' ', $v);
  if (function_exists('mb_substr')) $v = mb_substr($v, 0, $max);
  return $v;
}

// ── Только POST ──────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  respond(false, 'Метод не поддерживается.', $isAjax, 405);
}

// ── Антиспам: honeypot (скрытое поле, которое заполняют только боты) ──────
if (!empty($_POST['website'])) {
  // Тихо «принимаем», чтобы бот не понял, что отсечён.
  respond(true, 'Спасибо! Заявка принята.', $isAjax);
}

// ── Согласие на обработку ПДн (152-ФЗ) обязательно ───────────────────────
if (empty($_POST['consent'])) {
  respond(false, 'Необходимо согласие на обработку персональных данных.', $isAjax, 422);
}

// ── Сбор и валидация полей ───────────────────────────────────────────────
$name  = clean($_POST['name']  ?? '', 120);
$phone = clean($_POST['phone'] ?? '', 40);
$type  = clean($_POST['type']  ?? '', 80);

$digits = preg_replace('/\D+/', '', $phone);
if ($name === '' || strlen($digits) < 10) {
  respond(false, 'Укажите имя и корректный номер телефона.', $isAjax, 422);
}

$ip   = $_SERVER['REMOTE_ADDR'] ?? '';
$time = date('Y-m-d H:i:s');

// ── Текст уведомления ────────────────────────────────────────────────────
$lines = [
  "Новая заявка с сайта",
  "Дата:     $time",
  "Имя:      $name",
  "Телефон:  $phone",
  "Объект:   $type",
  "IP:       $ip",
];
$body = implode("\n", $lines);

// ── Сохранение в журнал (данные на сервере, т.е. в РФ при РФ-хостинге) ────
if (!is_dir($LEADS_DIR)) { @mkdir($LEADS_DIR, 0750, true); }
if (is_dir($LEADS_DIR)) {
  // Защита каталога от прямого скачивания через веб.
  $htaccess = $LEADS_DIR . '/.htaccess';
  if (!file_exists($htaccess)) { @file_put_contents($htaccess, "Deny from all\nRequire all denied\n"); }
  $record = json_encode(
    ['time' => $time, 'name' => $name, 'phone' => $phone, 'type' => $type, 'ip' => $ip],
    JSON_UNESCAPED_UNICODE
  );
  @file_put_contents($LEADS_DIR . '/leads-' . date('Y-m') . '.jsonl', $record . "\n", FILE_APPEND | LOCK_EX);
}

// ── Отправка на e-mail ───────────────────────────────────────────────────
$sent = false;
$headers = [
  'From: Феррум Строй <' . $FROM_EMAIL . '>',
  'Reply-To: ' . $FROM_EMAIL,
  'Content-Type: text/plain; charset=UTF-8',
  'MIME-Version: 1.0',
];
$encodedSubject = '=?UTF-8?B?' . base64_encode($SUBJECT) . '?=';
if (@mail($TO_EMAIL, $encodedSubject, $body, implode("\r\n", $headers))) {
  $sent = true;
}

// ── Дубль в Telegram (если настроен) ─────────────────────────────────────
if ($TELEGRAM_BOT_TOKEN !== '' && $TELEGRAM_CHAT_ID !== '' && function_exists('curl_init')) {
  $tgText = "🏗 Новая заявка с сайта\n\n"
          . "👤 $name\n📞 $phone\n🏢 $type\n🕒 $time";
  $ch = curl_init("https://api.telegram.org/bot{$TELEGRAM_BOT_TOKEN}/sendMessage");
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 8,
    CURLOPT_POSTFIELDS => ['chat_id' => $TELEGRAM_CHAT_ID, 'text' => $tgText],
  ]);
  $tgResp = curl_exec($ch);
  curl_close($ch);
  if ($tgResp !== false) $sent = true;
}

// ── Ответ ────────────────────────────────────────────────────────────────
if ($sent) {
  respond(true, 'Спасибо! Заявка отправлена — мы свяжемся с вами в ближайшее время.', $isAjax);
} else {
  // Заявка сохранена в журнал, но письмо не ушло — сообщаем мягко.
  respond(true, 'Спасибо! Заявка принята. Если не перезвоним — напишите нам напрямую.', $isAjax);
}
