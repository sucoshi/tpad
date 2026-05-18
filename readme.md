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

#### 4. Claude Code (MCPサーバー) と連携する

Tpadは Model Context Protocol (MCP) に対応しています。Claude CLIなどのMCPクライアントに登録することで、Claudeが生成したテキストをファイルとして書き出すことなく直接ブラウザで開き、視覚的に確認・編集した結果をそのままチャットセッションに戻すことができます。

##### 設定方法 (`~/.claude.json` への追記)

```json
{
  "mcpServers": {
    "tpad": {
      "command": "npx",
      "args": [
        "-y",
        "--package",
        "github:YOUR_GITHUB_USERNAME/tpad",
        "tpad-mcp"
      ]
    }
  }
}
```
*※ `YOUR_GITHUB_USERNAME` はご自身のGitHubユーザー名に置き換えてください。*
*※ グローバルインストール済みの場合は、`"command": "tpad-mcp"` の指定のみで動作します。*

##### 使い方・動作の流れ

1. **チャットで文章作成を指示する**
   Claude CLIとの対話中に、Tpad上での文章作成や編集を指示します。
   > **指示例**: `「API仕様書」のドラフトをTpadで作成して。`
2. **ブラウザが起動しエディタが開く**
   ClaudeがMCP経由で `tpad` ツールを呼び出し、生成されたMarkdownを保持した状態でブラウザが自動起動します。
3. **確認・編集する**
   ブラウザでテーブルの追加やテキストの微調整を行います。
4. **結果をチャットに戻す**
   Tpadヘッダーの「完了して出力」をクリックすると、ブラウザが終了し、編集後のテキストが直接Claudeへ送信されます。Claudeは受け取った編集結果を基に対話を継続します。

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

#### 4. Claude Code (MCP Server) Integration

Tpad features a built-in Model Context Protocol (MCP) server. By registering Tpad as an MCP server with Claude CLI, Claude can launch Tpad in your browser to draft or edit Markdown content. Your visual adjustments are piped directly back into the active chat session.

##### Configuration (Add to `~/.claude.json`)

```json
{
  "mcpServers": {
    "tpad": {
      "command": "npx",
      "args": [
        "-y",
        "--package",
        "github:YOUR_GITHUB_USERNAME/tpad",
        "tpad-mcp"
      ]
    }
  }
}
```
*Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.*
*If installed globally, you can simplify the command to `"command": "tpad-mcp"`.*

##### How It Works

1. **Ask Claude to write or edit content in Tpad**
   Request Claude to draft or refine Markdown content directly in the editor.
   > **Example**: `Draft the API specification in tpad.`
2. **Browser launches with Tpad**
   Claude triggers the `tpad` MCP tool, launching your browser with the draft pre-loaded.
3. **Edit and review visually**
   Refine your tables, checklists, or text inside Tpad.
4. **Pipe results back to the chat**
   Click **Finish & Output** inside Tpad to close the session. The finalized Markdown content is sent directly back to Claude as the tool response, letting Claude continue the conversation using your edits.

---

## License

MIT © [YOUR_NAME](https://github.com/YOUR_GITHUB_USERNAME)
