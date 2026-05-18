# tpad 🍃

> **tpad** is an ultra-premium, macOS Tahoe-style Markdown editor that bridges the gap between your terminal and the browser.

[English](#english) | [日本語](#日本語)

---

## 日本語

### 🌟 特徴

* **macOS Tahoe風「フローティング・アイランド」UI**
  * 画面上部にホバーする美しい3つのすりガラス（グラスモフィズム）製アイランド。
  * スクロール時にテキストがアイランドの下を滑らかに潜り抜ける贅沢なレイアウト。
* **ターミナルとのシームレスな統合**
  * `tpad file.md` で即座にブラウザエディタを起動。
  * `cat note.md | tpad` のように、標準入力（stdin）からテキストを直接流し込んで編集可能。
  * 編集完了後、「完了して出力」をクリックすると、編集内容がターミナルの標準出力（stdout）へ即座に書き出され、プロセスが美しく終了します。
* **極上のWYSIWYG Markdown編集**
  * Tiptapを搭載し、テーブル、チェックリスト、マークダウン記法をリアルタイムにビジュアルレンダリング。
* **独立した「ステータス・トースト」**
  * 保存中・完了状態を、画面下部中央に浮かび上がる美しい独立したすりガラスのトーストで通知。高精細なCSSローディングスピナーやiOS準拠のステータスドットを搭載。
* **ローカル自動バックアップ & 履歴機能**
  * 万が一の切断でも安心な自動一時保存（バックアップ）と、最近開いたファイルのクイックアクセス履歴。

---

### 📦 インストール方法

知り合いやご自身の環境にインストールするには、ターミナルで以下のコマンドを実行します：

```bash
npm install -g github:YOUR_GITHUB_USERNAME/tpad
```

*※ `YOUR_GITHUB_USERNAME` はご自身のGitHubユーザー名に置き換えてください。*

---

### 🚀 使い方

#### 1. 指定ファイルを開いて編集する
```bash
tpad filename.md
```
ブラウザが自動的に起動し、Tpadの極上UIで編集できます。「保存」または `Cmd + S` でローカルファイルにリアルタイム同期されます。

#### 2. 標準入力から流し込んで編集する（パイプ処理）
```bash
cat draft.md | tpad > final.md
```
既存のテキストを流し込んで編集し、「完了して出力」を押すと、結果がそのまま次のコマンドやファイルに書き出されます。

#### 3. 編集結果をそのまま次のコマンドに繋ぐ
```bash
tpad | pbcopy
```
編集完了後、「完了して出力」を押すと、書いたテキストがそのままMacのクリップボードにコピーされます。

---

## English

### 🌟 Features

* **macOS Tahoe "Floating Islands" UI**
  * Three gorgeous glassmorphic (frosted glass) islands hovering gracefully at the top of the viewport.
  * Premium layout where editor text slides smoothly underneath the hovering capsules during scroll.
* **Seamless Terminal Integration**
  * Launch your browser-based editor instantly using `tpad file.md`.
  * Support for standard input (stdin) piping: `cat note.md | tpad`.
  * Click **Finish & Output** to write your changes directly back to terminal standard output (stdout) and cleanly close the session.
* **State-of-the-Art WYSIWYG Editor**
  * Powered by Tiptap. Visually formats tables, checklists, and standard markdown elements in real-time.
* **Dynamic iOS-Style Status Toast**
  * Status messages float elegantly at the bottom center. Built with dynamic micro CSS spinners, iOS-green success glow-dots, and error indicators.
* **Local Resiliency**
  * Automatic local backups and instant file access history.

---

### 📦 Installation

To install `tpad` globally, run:

```bash
npm install -g github:YOUR_GITHUB_USERNAME/tpad
```

*Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.*

---

### 🚀 Usage

#### 1. Edit a Specific File
```bash
tpad filename.md
```
Automatically opens Tpad in your default browser. Pressing **Save** or `Cmd + S` syncs directly back to your local file.

#### 2. Pipe Draft Content (Stdin / Stdout)
```bash
cat draft.md | tpad > final.md
```
Edit piped text instantly. Clicking **Finish & Output** pipes the final Markdown content straight to your destination file.

#### 3. Pipe Straight to Clipboard
```bash
tpad | pbcopy
```
Edit your text in the browser, and upon clicking **Finish & Output**, the formatted Markdown is copied straight to your Mac clipboard!

---

## 📄 License

MIT © [YOUR_NAME](https://github.com/YOUR_GITHUB_USERNAME)
