/**
 * 大安工業 彫刻シミュレーター 入稿受付バックエンド
 * ------------------------------------------------------------
 * Google Apps Script のウェブアプリとして公開して使います。
 * 入稿データを Google ドライブに保存し、スプレッドシートに一覧化します。
 */

// ============ 設定 ============
// 入稿画像を保存する Google ドライブのフォルダ ID
// （フォルダを開いたときの URL の /folders/ 以降の文字列）
const FOLDER_ID = "1lvdgfq9P-vBKYgjJrUHpvr7uOLBoW432";

// 入稿一覧を記録するスプレッドシートの ID
// （スプレッドシートを開いたときの URL の /d/ と /edit の間の文字列）
const SHEET_ID = "1JsXU-KN3qvgmquQbS6y8pJwxfd6G46wi9W6NfCtHQsw";

// 入稿があったときに通知を受け取るメールアドレス
const NOTIFY_MAIL = "soyasui@daiyasu.jp";
// ==============================


function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const now = new Date();
    const stamp = Utilities.formatDate(now, "Asia/Tokyo", "yyyyMMdd_HHmmss");

    // --- 入稿データ（彫刻用PNG）をドライブに保存 ---
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const blob = Utilities.newBlob(
      Utilities.base64Decode(data.image.replace(/^data:image\/png;base64,/, "")),
      "image/png",
      stamp + "_" + data.plateKey + "_" + data.name + ".png"
    );
    const file = folder.createFile(blob);
    const fileUrl = file.getUrl();   // 非公開のまま。管理者はログイン状態で開ける

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

    // --- 管理者に通知メール（入稿データを添付） ---
    MailApp.sendEmail({
      to: NOTIFY_MAIL,
      replyTo: data.mail,
      subject: "【入稿】" + data.name + " 様 / " + data.plate,
      body:
        "彫刻シミュレーターから入稿がありました。\n" +
        "入稿データはこのメールに添付しています。\n\n" +
        "お名前　　：" + data.name + "\n" +
        "メール　　：" + data.mail + "\n" +
        "プレート　：" + data.plate + "（" + data.plateSize + "）\n" +
        "彫刻サイズ：" + data.engraveSize + "\n" +
        "拡大率　　：" + data.scale + "\n" +
        "濃さ　　　：" + data.density + "\n" +
        "位置ズレ　：" + data.offset + "\n" +
        "備考　　　：" + (data.note || "（なし）") + "\n\n" +
        "ドライブ　：" + fileUrl + "\n\n" +
        "※ このメールに返信すると、お客様に直接届きます。\n" +
        "※ STORESの注文一覧でお名前・メールアドレスを照合してください。",
      attachments: [blob]
    });

    // --- お客様に自動返信（控えとして入稿データを添付） ---
    MailApp.sendEmail({
      to: data.mail,
      replyTo: NOTIFY_MAIL,
      subject: "【大安工業】入稿を受け付けました",
      attachments: [blob],
      body:
        data.name + " 様\n\n" +
        "このたびはご注文いただきありがとうございます。\n" +
        "以下の内容で入稿を受け付けました。\n" +
        "入稿データを控えとして添付しています。\n\n" +
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
