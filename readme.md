# tpad

ターミナルとブラウザを連携させるMarkdownエディタです。

[English](#english) | [日本語](#日本語)

---

## 日本語

### 特徴

* **ターミナルとの統合**
  * `tpad file.md` でブラウザを起動し編集可能。
  * `cat note.md | tpad` のように、標準入力（stdin）からテキストを流し込んで編集可能。
  * 「完了して出力」ボタンのクリックにより、編集内容を標準出力（stdout）へ出力して終了。
* **WYSIWYG Markdown編集**
  * Tiptapを採用し、テーブル、タスクリスト、各種マークダウン記法をリアルタイムにビジュアル表示。
* **ステータス表示**
  * 保存中・完了状態を、画面下部中央のトースト通知（インジケーター付き）で表示。
* **バックアップ & 履歴機能**
  * 自動一時保存（バックアップ）および最近開いたファイルのアクセス履歴。

---

### インストール方法

ターミナルで以下のコマンドを実行し、グローバルにインストールします：

```bash
npm install -g github:YOUR_GITHUB_USERNAME/tpad
```

*※ `YOUR_GITHUB_USERNAME` はご自身のGitHubユーザー名に置き換えてください。*

---

### 使い方

#### 1. 指定ファイルを開いて編集する
```bash
tpad filename.md
```
ブラウザが起動しエディタが開きます。「保存」または `Cmd + S` で指定のローカルファイルに同期保存されます。

#### 2. 標準入力から流し込んで編集する（パイプ処理）
```bash
cat draft.md | tpad > final.md
```
既存のテキストを標準入力から読み込んで編集し、「完了して出力」で結果を指定のファイルへ書き出します。

#### 3. 編集結果をそのまま次のコマンドに繋ぐ
```bash
tpad | pbcopy
```
編集完了後に「完了して出力」をクリックすると、作成したテキストがMacのクリップボードにコピーされます。

#### 4. Claude Codeのインタラクティブチャットと連携する
Claude CLIでのチャットセッション中に、エディタを起動して手動でテキストや構成をビジュアル編集したい場合、チャット内で直接Tpadの起動を指示できます。

* **チャット入力例**:
  > `tpad memo.md を開いて。手動で構成を調整します。`

* **動作の流れ**:
  1. Claudeが自動的にコマンドを実行し、ブラウザでTpadが起動します。
  2. 編集を完了して「完了して出力」をクリックすると、Tpadのプロセスが終了して制御がターミナルに戻ります。
  3. Claudeが更新後のファイルを読み込んで対話を継続します。

---

## English

A Markdown editor designed to bridge the terminal and the browser.

### Features

* **Terminal Integration**
  * Open and edit files with `tpad file.md`.
  * Supports piping text via standard input (e.g., `cat note.md | tpad`).
  * Click "Finish & Output" to write content to standard output (stdout) and close the process.
* **WYSIWYG Markdown Editing**
  * Powered by Tiptap, providing real-time rendering of tables, task lists, and markdown formats.
* **Status Toast**
  * Displays saving and output status in a floating toast at the bottom center.
* **Backups & History**
  * Automatic session backups and quick access history for recently opened files.

---

### Installation

To install `tpad` globally, run:

```bash
npm install -g github:YOUR_GITHUB_USERNAME/tpad
```

*Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.*

---

### Usage

#### 1. Edit a Specific File
```bash
tpad filename.md
```
Automatically opens Tpad in your default browser. Pressing **Save** or `Cmd + S` syncs directly back to the specified local file.

#### 2. Pipe Draft Content (Stdin / Stdout)
```bash
cat draft.md | tpad > final.md
```
Edit piped text instantly. Clicking **Finish & Output** pipes the final Markdown content straight to your destination file.

#### 3. Pipe Straight to Clipboard
```bash
tpad | pbcopy
```
Edit your text in the browser, and upon clicking **Finish & Output**, the formatted Markdown is copied straight to your Mac clipboard.

#### 4. Integration with Interactive Claude Code Chat
During a chat session with the Claude CLI, you can ask Claude to open any Markdown file in Tpad to perform manual rich-text edits or visual layout adjustments.

* **Example Prompt in Claude Chat**:
  > `Open memo.md in tpad so I can manually adjust the layout.`

* **How It Works**:
  1. Claude executes the command in the background, opening Tpad in your browser.
  2. Perform your visual edits, and click "Finish & Output" to close the editor session.
  3. Control returns to your terminal. Claude reads the updated file content and continues the conversation.

---

## License

MIT © [YOUR_NAME](https://github.com/YOUR_GITHUB_USERNAME)
