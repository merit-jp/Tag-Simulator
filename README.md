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

    // --- 保存先フォルダを決める ---
    // まとめる単位は sessionId（ブラウザでページを開いた 1 回分）。
    // 「続けて入稿する」で送られた分だけが同じフォルダに入る。
    // 後日の再注文や同姓同名の別人は sessionId が違うので必ず別フォルダになる。
    const root = DriveApp.getFolderById(FOLDER_ID);
    const itemNo = data.itemNo || 1;
    const day = Utilities.formatDate(now, "Asia/Tokyo", "yyyyMMdd");
    const sid = data.sessionId || Utilities.getUuid().slice(0, 10);
    const orderKey = day + "_" + data.name + "_" + sid;

    const found = root.getFoldersByName(orderKey);
    let folder;
    if (found.hasNext()) {
      folder = found.next();
    } else {
      folder = root.createFolder(orderKey);
      folder.setDescription(data.name + " / " + data.mail);
    }

    // --- 入稿データ（彫刻用PNG）を保存 ---
    const fileName = ("0" + itemNo).slice(-2) + "_" + data.plateKey
                   + "_x" + (data.qty || 1) + "枚.png";
    const blob = Utilities.newBlob(
      Utilities.base64Decode(data.image.replace(/^data:image\/png;base64,/, "")),
      "image/png",
      fileName
    );
    const file = folder.createFile(blob);
    const fileUrl = file.getUrl();      // 非公開のまま
    const folderUrl = folder.getUrl();

    // --- スプレッドシートに記録 ---
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "受付日時", "注文ID", "お名前", "メール", "購入状況", "点目", "枚数",
        "プレート", "向き", "プレートサイズ", "彫刻サイズ",
        "拡大率", "位置ズレ", "備考", "画像URL", "フォルダURL", "ステータス"
      ]);
    }
    sheet.appendRow([
      Utilities.formatDate(now, "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss"),
      sid,
      data.name,
      data.mail,
      data.purchase || "",
      data.itemNo || 1,
      data.qty || 1,
      data.plate,
      data.orient || "",
      data.plateSize,
      data.engraveSize,
      data.scale,
      data.offset,
      data.note || "",
      fileUrl,
      folderUrl,
      "未対応"
    ]);

    // --- 管理者に通知メール（入稿データを添付） ---
    MailApp.sendEmail({
      to: NOTIFY_MAIL,
      replyTo: data.mail,
      subject: "【入稿】" + data.name + " 様 / " + data.plate
             + " ×" + (data.qty || 1) + "枚"
             + ((data.itemNo && data.itemNo > 1) ? "（" + data.itemNo + "点目）" : ""),
      body:
        "彫刻シミュレーターから入稿がありました。\n" +
        "入稿データはこのメールに添付しています。\n\n" +
        "お名前　　：" + data.name + "\n" +
        "メール　　：" + data.mail + "\n" +
        "点目　　　：" + (data.itemNo || 1) + "点目\n" +
        "枚数　　　：" + (data.qty || 1) + "枚\n" +
        "注文ID　　：" + sid + "\n" +
        "プレート　：" + data.plate + "（" + data.plateSize + "）\n" +
        "彫刻サイズ：" + data.engraveSize + "\n" +
        "拡大率　　：" + data.scale + "\n" +
        "濃さ　　　：" + data.density + "\n" +
        "位置ズレ　：" + data.offset + "\n" +
        "備考　　　：" + (data.note || "（なし）") + "\n\n" +
        "画像　　　：" + fileUrl + "\n" +
        "フォルダ　：" + folderUrl + "\n\n" +
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
        "彫刻サイズ：" + data.engraveSize + "\n" +
        "枚数　　　：" + (data.qty || 1) + "枚\n\n" +
        "内容を確認のうえ、3営業日以内に発送いたします。\n" +
        "仕上がりに関してご相談が必要な場合は、こちらからご連絡いたします。\n\n" +
        "■ 入稿内容の修正について\n" +
        "　データや枚数に誤りがあった場合は、このメールにご返信ください。\n" +
        "　発送前であれば修正を承ります。\n\n" +
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
