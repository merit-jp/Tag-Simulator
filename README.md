# 彫刻シミュレーター セットアップ手順

## 構成

```
お客さん
  ↓ STORESで購入
  ↓ 商品ページの「デザインを作る」リンク
シミュレーター（index.html／GitHub Pages）
  ↓ 画像アップロード・サイズ調整・入稿情報入力
  ↓ 「この内容で入稿する」
Google Apps Script（バックエンド）
  ↓
  ├─ 画像を Google ドライブに保存
  ├─ スプレッドシートに一覧記録
  ├─ 大安工業に通知メール
  └─ お客さんに自動返信メール
```

Googleフォームを経由しません。1画面で完結します。

---

## 手順1：Googleドライブの準備

1. Googleドライブに「入稿データ」フォルダを作る
2. フォルダを開き、URLの `/folders/` 以降の文字列をコピー → これが **FOLDER_ID**
3. Googleスプレッドシートを新規作成（名前は「入稿一覧」など）
4. URLの `/d/` と `/edit` の間の文字列をコピー → これが **SHEET_ID**

## 手順2：Apps Scriptを設置

1. `script.google.com` を開いて「新しいプロジェクト」
2. `apps-script.gs` の中身をすべて貼り付け
3. 冒頭の3か所を書き換える

```javascript
const FOLDER_ID  = "手順1でコピーしたフォルダID";
const SHEET_ID   = "手順1でコピーしたスプレッドシートID";
const NOTIFY_MAIL = "通知を受け取るメールアドレス";
```

4. 右上の「デプロイ」→「新しいデプロイ」
5. 種類を選択 → **ウェブアプリ**
6. 設定
   - 次のユーザーとして実行：**自分**
   - アクセスできるユーザー：**全員**
7. 「デプロイ」→ 権限を承認
8. 表示される **ウェブアプリのURL** をコピー

## 手順3：シミュレーターにURLを設定

`index.html` の以下の1行を書き換える。

```javascript
const ENDPOINT = "手順2でコピーしたウェブアプリURL";
```

## 手順4：GitHub Pagesで公開

1. GitHubで新しいリポジトリを作成（例：`plate-simulator`）
2. `index.html` をアップロード
3. Settings → Pages → Source を `main` ブランチに設定
4. `https://ユーザー名.github.io/plate-simulator/` で公開される

## 手順5：STORESの商品ページにリンクを貼る

商品説明欄に以下を追記。

```
デザインの確認・入稿はこちら
→ https://ユーザー名.github.io/plate-simulator/
```

---

## プレートを追加・変更する

`index.html` の `PLATES` を編集するだけ。

```javascript
const PLATES = {
  circle: { name:"円形", w:50, h:50, r:null, hole:{x:0, y:-19.5}, holeD:4 },
  //                     ↑幅  ↑高さ  ↑角丸R   ↑穴の位置(中心からのmm)  ↑穴径
};
```

- `r: null` … 円形として描画
- `r: 数値` … その半径で角丸の長方形として描画
- `hole.x` / `hole.y` … プレート中心からのmm（上がマイナス、左がマイナス）

同時にHTMLのボタンも1つ追加する。

```html
<button class="plate-btn" data-plate="キー名" onclick="selectPlate('キー名')">
  <span class="plate-icon">...</span>
  <span><span class="plate-name">表示名</span><span class="plate-dim">寸法</span></span>
</button>
```

---

## 仕様メモ

| 項目 | 内容 |
|---|---|
| 表示解像度 | 14 px/mm |
| 書き出し解像度 | 40 px/mm（約1000dpi） |
| 彫刻サイズ100% | プレートの長辺いっぱい |
| 画像処理 | しきい値で白黒2値化。白は透過（彫刻しない） |
| 書き出し形式 | PNG（プレート外は白、彫刻部は黒） |
| 費用 | すべて無料（GitHub Pages + Google Apps Script） |

---

## 注意点

- Apps Scriptの1日あたりのメール送信数には上限があります（無料アカウントで100通/日）
- 画像は約1000dpiで書き出されるためファイルサイズが数MBになります
- 送信に失敗した場合は「画像だけ保存する」でPNGを保存してメールで受け取る運用にフォールバックできます
