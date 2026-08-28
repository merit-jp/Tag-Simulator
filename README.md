# 彫刻シミュレーター

大安工業のステンレスプレート受注用シミュレーター。
公開URL: https://merit-jp.github.io/Tag-Simulator/

---

## 構成

```
お客さん
  ↓ STORESで購入（購入が先）
  ↓ 商品説明のリンクからシミュレーターへ
index.html（GitHub Pages）
  ↓ 形を選ぶ → 画像アップ → 大きさ・濃さ・位置を調整
  ↓ 購入済みにチェック → 入稿
Google Apps Script（バックエンド）
  ├─ 注文ごとのフォルダを作ってPNGを保存
  ├─ スプレッドシートに記録
  ├─ 大安工業に通知メール（PNG添付）
  └─ お客さんに自動返信（PNG添付）
```

サーバー不要。GitHub PagesとGoogle Apps Scriptだけで完結します。

---

## ファイル

| ファイル | 置き場所 | 役割 |
|---|---|---|
| `index.html` | GitHub Pages | 画面のすべて。1ファイル完結 |
| `apps-script.gs` | Google Apps Script | 入稿の受け口 |
| `README.md` | GitHub | この手順書 |

---

## 現在の設定値

`index.html`

```javascript
const ENDPOINT       = "https://script.google.com/macros/s/AKfycbw13.../exec";
const STORE_ITEM_URL = "https://dyk.stores.jp/items/6a8d56ef5c2c07b8138cb857";
const STORE_HOME_URL = "https://dyk.stores.jp/";
```

`apps-script.gs`

```javascript
const FOLDER_ID   = "1lvdgfq9P-vBKYgjJrUHpvr7uOLBoW432";   // 大安工業EC > タグ注文
const SHEET_ID    = "1JsXU-KN3qvgmquQbS6y8pJwxfd6G46wi9W6NfCtHQsw";
const NOTIFY_MAIL = "soyasui@daiyasu.jp";
```

---

## 更新のしかた

**index.html を直したとき**

GitHubでファイルを開く → 鉛筆アイコン → 貼り替え → Commit changes。
1〜2分で公開サイトに反映されます。

**apps-script.gs を直したとき**

Apps Scriptエディタに貼り替え → 保存 → デプロイ → デプロイを管理 →
鉛筆アイコン → バージョンを「新バージョン」に → デプロイ。
URLは変わりません。**この再デプロイを忘れると反映されません。**

---

## プレートを追加・変更する

`index.html` の `PLATES` を編集します。

```javascript
const PLATES = {
  circle: { name:"円形",       shape:"circle", w:50, h:50,
            rotatable:false, base:"v" },
  dogtag: { name:"ドッグタグ", shape:"dogtag", w:40, h:66, bigD:56, fillet:5,
            rotatable:true,  base:"v" },
  bar:    { name:"細長タグ",   shape:"round",  w:90, h:20, r:2,
            rotatable:true,  base:"h" }
};
```

| キー | 意味 |
|---|---|
| `shape` | `circle` / `round`（角丸長方形）/ `dogtag` |
| `w` `h` | 基準の向きでの寸法（mm） |
| `r` | `round` のときの角丸半径（mm） |
| `bigD` `fillet` | `dogtag` 専用。大円の直径とフィレット半径 |
| `rotatable` | 縦横の切り替えを出すか |
| `base` | 基準の向き。`v`＝縦（穴は上）/ `h`＝横（穴は左） |

穴の位置は `HOLE_MARGIN`（端からの余白）と `HOLE_D`（穴径）から自動計算されるので、
プレートごとに書く必要はありません。

追加したらHTMLのボタンも1つ足します。

```html
<button class="plate-btn" data-plate="キー名" onclick="selectPlate('キー名')">
  <span class="plate-icon"><svg>…</svg></span>
  <span><span class="plate-name">表示名</span><span class="plate-dim">90 × 20 mm</span></span>
  <span class="plate-check"><svg>…</svg></span>
</button>
```

---

## ドッグタグの形状

40×66mmの長方形の上下辺に直径56mmの円を内接させ、重なりを切り出して、
接合部をR5でフィレットした形です。

```
大円の中心    上 (0, -5) / 下 (0, +5)   半径28
直線部との接合 x=±20, y=∓24.596
フィレット中心 (±15, ∓22.436) 半径5
```

`dogtagPath()` で8本の円弧をつないで描いています。
横向きのときはパスごと90°回転させるので、形状は保たれます。

---

## 仕様メモ

| 項目 | 内容 |
|---|---|
| 表示解像度 | 14 px/mm |
| 書き出し解像度 | 40 px/mm（約1000dpi） |
| 彫刻サイズ100% | プレートの長辺いっぱい |
| 画像処理 | グレースケール変換＋ガンマ補正（濃さスライダー） |
| 書き出し形式 | PNG。プレート形に切り抜き、外側と穴は透過 |
| 表示モード | 彫刻データ（既定）/ 仕上がりイメージ |
| フォルダ分け | `sessionId` 単位。ページを開いた1回分がまとまる |
| 費用 | すべて無料 |

---

## 注意点

- **Apps Scriptは CORS ヘッダーを返さない。** `fetch` は `mode:"no-cors"` で送っています。
  レスポンスは読めませんが処理は実行されます。ここを変えると送信できなくなります。
- Apps Scriptのメール送信は無料枠で1日100通まで。1入稿で2通使います。
- 書き出しPNGは1000dpi相当なので数MBになります。添付が重くなったらリンクのみに切り替えを。
- スプレッドシートの列を増やしたときは、1行目を削除すると新しい見出しが自動で入ります。
- 送信に失敗した場合は「入稿データを保存する」でPNGを保存し、メールで受け取る運用に切り替えられます。

---

## 動作確認のチェックリスト

- [ ] スマホで横スクロールしない／左右に余白がある
- [ ] スクロールしてもプレビューの高さが変わらない
- [ ] 彫刻データが既定で表示され、「仕上がり」で鏡面に切り替わる
- [ ] ドッグタグ・細長タグの縦横切り替えで穴が上／左に移る
- [ ] 購入済みにチェックを入れるまで入稿ボタンが押せない
- [ ] 2回続けて入稿すると、ドライブで1つのフォルダにまとまる
- [ ] 累計が「円形 2枚 / ドッグタグ（縦） 3枚」のように出る
- [ ] 通知メールと自動返信が届き、PNGが添付されている
