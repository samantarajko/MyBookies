from flask import Flask, request, jsonify
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

DB_PATH = 'library.db'

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS books (
        book_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        book_title TEXT,
        book_author TEXT,
        book_year INTEGER,
        read TEXT CHECK(read IN ('not read', 'read', 'currently reading')) NOT NULL DEFAULT 'not read',
        rating INTEGER CHECK(rating BETWEEN 1 AND 5),
        image_url TEXT,
        finished_reading DATE
    )
    ''')


    

    cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (username)')
    conn.commit()
    conn.close()


@app.before_first_request
def setup():
    init_db()

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    hashed = generate_password_hash(password)
    db = get_db()
    try:
        db.execute('INSERT INTO users (username, password) VALUES (?, ?)', (username, hashed))
        db.commit()
        user_id = db.execute('SELECT user_id FROM users WHERE username = ?', (username,)).fetchone()['user_id']
        return jsonify({'message': 'Registered', 'user_id': user_id}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username taken'}), 409

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    db = get_db()
    row = db.execute('SELECT user_id, password FROM users WHERE username = ?', (username,)).fetchone()
    if row and check_password_hash(row['password'], password):
        return jsonify({'message': 'Logged in', 'user_id': row['user_id']}), 200
    return jsonify({'error': 'Invalid credentials'}), 401

def get_books(user_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT book_id, user_id, book_title, book_author, book_year, read, rating, image_url, finished_reading FROM books WHERE user_id = ?', (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            'book_id': row[0],
            'user_id': row[1],
            'book_title': row[2],
            'book_author': row[3],
            'book_year': row[4],
            'read': row[5],
            'rating': row[6],
            'image_url': row[7],
            'finished_reading': row[8]
        }
        for row in rows
    ]




def get_books_by_status(user_id, status):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT book_id, user_id, book_title, book_author, book_year, read, rating, image_url, finished_reading
        FROM books
        WHERE user_id = ? AND read = ?
    ''', (user_id, status))
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            'book_id': row[0],
            'user_id': row[1],
            'book_title': row[2],
            'book_author': row[3],
            'book_year': row[4],
            'read': row[5],
            'rating': row[6],
            'image_url': row[7],
            'finished_reading': row[8]
        }
        for row in rows
    ]


def add_book_to_db(book):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO books (user_id, book_title, book_author, book_year, read, rating, image_url, finished_reading)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        book['user_id'],
        book['book_title'],
        book['book_author'],
        book['book_year'],
        book['read'],
        book.get('rating'),
        book.get('image_url'),
        book.get('finished_reading')
    ))
    conn.commit()
    conn.close()


@app.route('/addbook', methods=['POST'])
def add_book():
    data = request.get_json()
    required = ['user_id', 'book_title', 'book_author', 'book_year', 'read']
    if not all(field in data for field in required):
        return jsonify({'error': 'Missing fields'}), 400


    if len(data['book_title']) > 200 or len(data['book_author']) > 200:
        return jsonify({'error': 'Title and Author must be 200 characters or less.'}), 400

    try:
        year = int(data['book_year'])
        if len(str(year)) > 6:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({'error': 'Year must be a valid number.'}), 400


    valid_statuses = ['not read', 'read', 'currently reading']
    if data['read'] not in valid_statuses:
        return jsonify({'error': f"Invalid 'read' status. Must be one of: {', '.join(valid_statuses)}"}), 400

    add_book_to_db(data)
    return jsonify({'message': 'Book added successfully'}), 201

@app.route('/deletebook', methods=['POST'])
def delete_book():
    data = request.get_json()
    book_id = data.get('book_id')
    user_id = data.get('user_id')
    print(book_id)
    print(user_id)
    if not book_id or not user_id:
        return jsonify({'error': 'Missing book_id or user_id'}), 400

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()


    cursor.execute('SELECT * FROM books WHERE book_id = ? AND user_id = ?', (book_id, user_id))
    book = cursor.fetchone()

    if not book:
        conn.close()
        return jsonify({'error': 'Book not found or not owned by user'}), 404

    cursor.execute('DELETE FROM books WHERE book_id = ? AND user_id = ?', (book_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Book deleted successfully'}), 200


@app.route('/editbook', methods=['POST'])
def edit_book():
    data = request.get_json()
    if 'book_id' not in data:
        return jsonify({'error': 'Missing book_id'}), 400

    book_id = data['book_id']
    updatable = ['book_title', 'book_author', 'book_year', 'read', 'rating', 'image_url', 'finished_reading']
    updates = []
    values = []

    for field in updatable:
        if field in data:
            updates.append(f"{field} = ?")
            values.append(data[field])

    if not updates:
        return jsonify({'error': 'No fields to update'}), 400

    values.append(book_id)
    query = f"UPDATE books SET {', '.join(updates)} WHERE book_id = ?"

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(query, values)
    conn.commit()
    conn.close()
    return jsonify({'message': 'Book updated successfully'})



@app.route('/books/<int:user_id>', methods=['GET'])
def books_by_user(user_id):
    books_list = get_books(user_id)
    return jsonify(books_list)

@app.route('/books/<int:user_id>/read', methods=['GET'])
def books_read(user_id):
    books_list = get_books_by_status(user_id, 'read')
    return jsonify(books_list)

@app.route('/books/<int:user_id>/not_read', methods=['GET'])
def books_not_read(user_id):
    books_list = get_books_by_status(user_id, 'not read')
    return jsonify(books_list)

@app.route('/books/<int:user_id>/currently_reading', methods=['GET'])
def books_currently_reading(user_id):
    books_list = get_books_by_status(user_id, 'currently reading')
    return jsonify(books_list)


from datetime import datetime
import calendar

@app.route('/books/finished_this_month', methods=['GET'])
def books_finished_this_month():
    user_id = request.args.get('user_id', type=int)
    if user_id is None:
        return jsonify({'error': 'Missing user_id'}), 400

    now = datetime.now()
    current_month = now.month
    current_year = now.year

    a, b = calendar.monthrange(current_year, current_month)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT COUNT(*) 
        FROM books
        WHERE user_id = ?
          AND read = 'read'
          AND finished_reading IS NOT NULL
          AND date(finished_reading) BETWEEN date(?) AND date(?)
    ''', (user_id, f"{current_year}-{current_month:02d}-01", f"{current_year}-{current_month:02d}-{b:02d}"))
    
    count = cursor.fetchone()[0]
    conn.close()
    return jsonify({'count': count})


@app.route('/books/finished_this_year', methods=['GET'])
def books_finished_this_year():
    user_id = request.args.get('user_id', type=int)
    if user_id is None:
        return jsonify({'error': 'Missing user_id'}), 400

    now = datetime.now()
    current_year = now.year
    first_day = f"{current_year}-01-01"
    last_day = f"{current_year}-12-31"

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT COUNT(*)
        FROM books
        WHERE user_id = ?
          AND read = 'read'
          AND finished_reading IS NOT NULL
          AND date(finished_reading) BETWEEN date(?) AND date(?)
    ''', (user_id, first_day, last_day))

    count = cursor.fetchone()[0]
    conn.close()
    return jsonify({'count': count})


@app.route('/books/<int:user_id>/counts', methods=['GET'])
def get_book_counts(user_id):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT read, COUNT(*) AS count
        FROM books
        WHERE user_id = ?
        GROUP BY read
    ''', (user_id,))
    rows = cursor.fetchall()

    counts = {
        'read': 0,
        'not_read': 0,
        'currently_reading': 0,
        'total': 0
    }


    for row in rows:
        read_status = row['read']
        count = row['count']
        if read_status == 'read':
            counts['read'] = count
        elif read_status == 'not read':
            counts['not_read'] = count
        elif read_status == 'currently reading':
            counts['currently_reading'] = count


    cursor.execute('SELECT COUNT(*) AS total FROM books WHERE user_id = ?', (user_id,))
    counts['total'] = cursor.fetchone()['total']

    return jsonify(counts)

@app.route('/username/<int:user_id>', methods=['GET'])
def get_username(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT username FROM users WHERE user_id = ?', (user_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return jsonify({'user_id': user_id, 'username': row['username']}), 200
    else:
        return jsonify({'error': 'User not found'}), 404

@app.route('/username/<int:user_id>', methods=['PUT'])
def update_username(user_id):
    data = request.get_json()
    new_username = data.get('username')

    if not new_username:
        return jsonify({'error': 'Username is required'}), 400

    conn = get_db()
    cursor = conn.cursor()


    cursor.execute('SELECT user_id FROM users WHERE username = ?', (new_username,))
    existing = cursor.fetchone()
    if existing and existing['user_id'] != user_id:
        conn.close()
        return jsonify({'error': 'Username already taken'}), 409

    cursor.execute('UPDATE users SET username = ? WHERE user_id = ?', (new_username, user_id))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Username updated successfully', 'username': new_username})

@app.route('/books/<int:user_id>/rating_summary', methods=['GET'])
def get_rating_summary(user_id):
    conn = get_db()
    cursor = conn.cursor()


    cursor.execute('''
        SELECT rating, COUNT(*) as count
        FROM books
        WHERE user_id = ? AND rating IS NOT NULL
        GROUP BY rating
    ''', (user_id,))
    rating_rows = cursor.fetchall()

    rating_counts = {str(i): 0 for i in range(1, 6)}
    for row in rating_rows:
        rating_counts[str(row['rating'])] = row['count']


    cursor.execute('SELECT COUNT(*) AS total FROM books WHERE user_id = ?', (user_id,))
    total = cursor.fetchone()['total']


    cursor.execute('SELECT AVG(rating) AS avg_rating FROM books WHERE user_id = ? AND rating IS NOT NULL', (user_id,))
    avg_rating = cursor.fetchone()['avg_rating']
    avg_rating = round(avg_rating, 2) if avg_rating is not None else None

    conn.close()

    response = {
        'total_books': total,
        'rating_counts': rating_counts,
        'average_rating': avg_rating
    }

    return jsonify(response)



@app.route('/change_password', methods=['POST'])
def change_password():
    data = request.get_json() or {}
    user_id          = data.get('user_id')
    current_password = data.get('current_password')
    new_password     = data.get('new_password')

    if not user_id or not current_password or not new_password:
        return jsonify({'error': 'User ID, current password, and new password required'}), 400

    db  = get_db()
    row = db.execute('SELECT password FROM users WHERE user_id = ?', (user_id,)).fetchone()
    if not row:
        db.close()
        return jsonify({'error': 'User not found'}), 404


    if not check_password_hash(row['password'], current_password):
        db.close()
        return jsonify({'error': 'Current password is incorrect'}), 401

    new_hash = generate_password_hash(new_password)
    db.execute('UPDATE users SET password = ? WHERE user_id = ?', (new_hash, user_id))
    db.commit()
    db.close()
    return jsonify({'message': 'Password updated successfully'}), 200


@app.route('/hi')
def say_hi():
    return "hi", 200, {'Content-Type': 'text/plain'}

if __name__ == '__main__':
    app.run(debug=True)
