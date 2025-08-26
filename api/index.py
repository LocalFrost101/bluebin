from flask import Flask, request, redirect, send_from_directory, abort
import os
import uuid

app = Flask(__name__, static_folder='../public')
pastes = {}

def escape_html(text):
    html_escape_table = {
        "&": "&amp;",
        '"': "&quot;",
        "'": "&#39;",
        ">": "&gt;",
        "<": "&lt;",
    }
    return "".join(html_escape_table.get(c, c) for c in text)

@app.route('/')
def index():
    return send_from_directory('../views', 'index.html')

@app.route('/style.css')
def style_css():
    return send_from_directory(app.static_folder, 'style.css')

@app.route('/create', methods=['POST'])
def create():
    content = request.form.get('content', '').strip()
    pin = request.form.get('pin', '').strip()
    if not content:
        return "Content cannot be empty. <a href='/'>Go Back</a>", 400
    if pin and (len(pin) > 4 or not pin.isdigit()):
        return "PIN must be up to 4 digits. <a href='/'>Go Back</a>", 400
    paste_id = uuid.uuid4().hex[:8]
    pastes[paste_id] = {'content': content, 'pin': pin}
    return redirect(f'/paste/{paste_id}')

@app.route('/paste/<id>', methods=['GET'])
def paste(id):
    paste = pastes.get(id)
    if not paste:
        return abort(404, description="Paste not found")
    if paste['pin']:
        return send_from_directory('../views', 'pin.html')
    # Read paste.html and insert values
    with open('../views/paste.html') as f:
        html = f.read()
    html = html.replace('{{id}}', id).replace('{{content}}', escape_html(paste['content']))
    return html

@app.route('/paste/<id>/pin', methods=['POST'])
def paste_pin(id):
    paste = pastes.get(id)
    if not paste:
        return abort(404, description="Paste not found")
    input_pin = request.form.get('pin', '')
    if paste['pin'] != input_pin:
        return f"Incorrect PIN. <a href='/paste/{id}'>Try again</a>"
    with open('../views/paste.html') as f:
        html = f.read()
    html = html.replace('{{id}}', id).replace('{{content}}', escape_html(paste['content']))
    return html

@app.route('/raw/<id>')
def raw(id):
    paste = pastes.get(id)
    if not paste:
        return abort(404, description="Not found")
    return paste['content'], 200, {'Content-Type': 'text/plain'}

if __name__ == '__main__':
    app.run(debug=True)
