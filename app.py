from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    # Renders templates/index.html from the templates/ directory
    return render_template('index.html')

if __name__ == '__main__':
    # Run with debug=True so you get full tracebacks in the browser and console
    app.run(host='127.0.0.1', port=5000, debug=True)
