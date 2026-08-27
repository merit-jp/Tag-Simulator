/**
 * 大安工業 彫刻シミュレーター 入稿受付バックエンド
 * ------------------------------------------------------------
 * Google Apps Script のウェブアプリとして公開して使います。
 * 入稿データを Google ドライブに保存し、スプレッドシートに一覧化します。
 */

// ============ 設定 ============
// 入稿画像を保存する Google ドライブのフォルダ ID
// （フォルダを開いたときの URL の /folders/ 以降の文字列）
const FOLDER_ID = "ここにフォルダIDを貼る";

// 入稿一覧を記録するスプレッドシートの ID
// （スプレッドシートを開いたときの URL の /d/ と /edit の間の文字列）
const SHEET_ID = "ここにスプレッドシートIDを貼る";

// 入稿があったときに通知を受け取るメールアドレス
const NOTIFY_MAIL = "your-mail@example.com";
// ==============================


function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const now = new Date();
    const stamp = Utilities.formatDate(now, "Asia/Tokyo", "yyyyMMdd_HHmmss");

    // --- 画像を Google ドライブに保存 ---
    const base64 = data.image.replace(/^data:image\/png;base64,/, "");
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64),
      "image/png",
      stamp + "_" + data.plateKey + "_" + data.name + ".png"
    );
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const file = folder.createFile(blob);
    const fileUrl = file.getUrl();

    // --- スプレッドシートに記録 ---
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "受付日時", "お名前", "メール",
        "プレート", "プレートサイズ", "彫刻サイズ",
        "拡大率", "位置ズレ", "備考", "画像URL", "ステータス"
      ]);
    }
    sheet.appendRow([
      Utilities.formatDate(now, "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss"),
      data.name,
      data.mail,
      data.plate,
      data.plateSize,
      data.engraveSize,
      data.scale,
      data.offset,
      data.note || "",
      fileUrl,
      "未対応"
    ]);

    // --- 管理者に通知メール ---
    MailApp.sendEmail({
      to: NOTIFY_MAIL,
      subject: "【入稿】" + data.name + " 様 / " + data.plate,
      body:
        "彫刻シミュレーターから入稿がありました。\n\n" +
        "お名前　　：" + data.name + "\n" +
        "メール　　：" + data.mail + "\n" +
        "プレート　：" + data.plate + "（" + data.plateSize + "）\n" +
        "彫刻サイズ：" + data.engraveSize + "\n" +
        "拡大率　　：" + data.scale + "\n" +
        "位置ズレ　：" + data.offset + "\n" +
        "備考　　　：" + (data.note || "（なし）") + "\n\n" +
        "画像：" + fileUrl + "\n\n" +
        "※ STORESの注文一覧でお名前・メールアドレスを照合してください。"
    });

    // --- お客様に自動返信 ---
    MailApp.sendEmail({
      to: data.mail,
      subject: "【大安工業】入稿を受け付けました",
      body:
        data.name + " 様\n\n" +
        "このたびはご注文いただきありがとうございます。\n" +
        "以下の内容で入稿を受け付けました。\n\n" +
        "プレート　：" + data.plate + "（" + data.plateSize + "）\n" +
        "彫刻サイズ：" + data.engraveSize + "\n\n" +
        "内容を確認のうえ、2営業日以内に発送いたします。\n" +
        "仕上がりに関してご相談が必要な場合は、こちらからご連絡いたします。\n\n" +
        "――――――――――――\n" +
        "大安工業株式会社\n" +
        "滋賀県東近江市蒲生堂町48番地\n" +
        "TEL 0748-55-2064\n" +
        "https://daiyasu-k.jp/"
    });

    return ContentService
      .createTextOutput(JSON.stringify({ result: "ok", url: fileUrl }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


function doGet() {
  return ContentService.createTextOutput("OK");
}
