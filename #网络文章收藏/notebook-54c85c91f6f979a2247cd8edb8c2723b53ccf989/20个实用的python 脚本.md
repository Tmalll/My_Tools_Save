1. 文件重复查找器
图片
实现思路

使用文件的哈希值来判断文件是否重复。

遍历指定目录，计算每个文件的哈希值。

将哈希值相同的文件视为重复文件。
        
        import os
        import hashlib
        def file_hash(file_path):
            # 计算文件的 MD5 哈希值
            hash_md5 = hashlib.md5()
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_md5.update(chunk)
            return hash_md5.hexdigest()
        def find_duplicates(directory):
            # 存储文件的哈希值和路径
            files = {}
            duplicates = []
            for root, _, filenames in os.walk(directory):
                for filename in filenames:
                    file_path = os.path.join(root, filename)
                    file_hash_value = file_hash(file_path)
                    if file_hash_value in files:
                        duplicates.append((files[file_hash_value], file_path))
                    else:
                        files[file_hash_value] = file_path
            return duplicates
        directory = "/path/to/your/directory"
        duplicates = find_duplicates(directory)
        for file1, file2 in duplicates:
            print(f"找到重复文件: {file1} 和 {file2}")


2. 自动整理下载文件夹
图片
实现思路

遍历下载文件夹，根据文件扩展名将文件移动到相应的子文件夹中。
        
        import os
        import shutil
        def organize_downloads(download_dir):
            # 定义文件类型和对应的文件夹
            extensions = {
                'Images': ('.jpg', '.jpeg', '.png', '.gif'),
                'Documents': ('.pdf', '.doc', '.docx', '.txt'),
                'Videos': ('.mp4', '.avi', '.mkv'),
                'Music': ('.mp3', '.wav', '.flac'),
                'Others': ()
            }
            for root, _, filenames in os.walk(download_dir):
                for filename in filenames:
                    file_path = os.path.join(root, filename)
                    extension = os.path.splitext(filename)[1].lower()
                    moved = False
                    for folder, exts in extensions.items():
                        if extension in exts:
                            target_folder = os.path.join(download_dir, folder)
                            if not os.path.exists(target_folder):
                                os.makedirs(target_folder)
                            shutil.move(file_path, os.path.join(target_folder, filename))
                            moved = True
                            print(f"已移动文件: {file_path} 到 {target_folder}")
                            break
                    if not moved:
                        target_folder = os.path.join(download_dir, 'Others')
                        if not os.path.exists(target_folder):
                            os.makedirs(target_folder)
                        shutil.move(file_path, os.path.join(target_folder, filename))
                        print(f"已移动文件: {file_path} 到 {target_folder}")
        download_dir = "/path/to/your/downloads"
        organize_downloads(download_dir)


3. 批量调整图像大小
图片
实现思路

使用 PIL 库（Pillow）来处理图像。

遍历指定目录，调整每个图像的大小。
        
        from PIL import Image
        import os
        def resize_images(directory, output_directory, size=(800, 600)):
            if not os.path.exists(output_directory):
                os.makedirs(output_directory)
            for root, _, filenames in os.walk(directory):
                for filename in filenames:
                    file_path = os.path.join(root, filename)
                    try:
                        with Image.open(file_path) as img:
                            img_resized = img.resize(size, Image.ANTIALIAS)
                            output_path = os.path.join(output_directory, filename)
                            img_resized.save(output_path)
                            print(f"已调整大小: {file_path} -> {output_path}")
                    except IOError:
                        print(f"调整大小失败: {file_path}")
        input_directory = "/path/to/your/images"
        output_directory = "/path/to/your/resized_images"
        resize_images(input_directory, output_directory)


4. 实时天气通知器
图片
实现思路

使用 OpenWeatherMap API 获取天气数据。

定期检查天气并发送通知。
        
        import requests
        import time
        import os
        API_KEY = 'your_openweathermap_api_key'
        CITY = 'YourCity'
        URL = f"http://api.openweathermap.org/data/2.5/weather?q={CITY}&appid={API_KEY}&units=metric"
        def get_weather():
            # 获取天气数据
            response = requests.get(URL)
            data = response.json()
            if data['cod'] == 200:
                temperature = data['main']['temp']
                description = data['weather'][0]['description']
                return f"温度: {temperature}°C, 描述: {description}"
            else:
                return "获取天气数据失败"
        def send_notification(message):
            # 发送 macOS 通知
            os.system(f"osascript -e 'display notification \"{message}\" with title \"天气更新\"'")
        while True:
            weather_info = get_weather()
            send_notification(weather_info)
            time.sleep(3600)  # 每小时更新一次


5. 邮件推送 Reddit 新帖
图片
实现思路

使用 PRAW 库获取 Reddit 帖子。

使用 SMTP 库发送邮件。
        
        import praw
        import smtplib
        from email.mime.text import MIMEText
        REDDIT_CLIENT_ID = 'your_reddit_client_id'
        REDDIT_CLIENT_SECRET = 'your_reddit_client_secret'
        REDDIT_USER_AGENT = 'your_user_agent'
        EMAIL_ADDRESS = 'your_email@example.com'
        EMAIL_PASSWORD = 'your_email_password'
        RECIPIENT_EMAIL = 'recipient_email@example.com'
        reddit = praw.Reddit(client_id=REDDIT_CLIENT_ID, client_secret=REDDIT_CLIENT_SECRET, user_agent=REDDIT_USER_AGENT)
        def send_email(subject, body):
            # 发送邮件
            msg = MIMEText(body)
            msg['From'] = EMAIL_ADDRESS
            msg['To'] = RECIPIENT_EMAIL
            msg['Subject'] = subject
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
                server.sendmail(EMAIL_ADDRESS, RECIPIENT_EMAIL, msg.as_string())
        def check_reddit(subreddit_name, limit=5):
            # 获取 Reddit 新帖
            subreddit = reddit.subreddit(subreddit_name)
            new_posts = []
            for post in subreddit.new(limit=limit):
                new_posts.append(f"标题: {post.title}\n链接: {post.url}\n\n")
            return ''.join(new_posts)
        subreddit_name = 'programming'
        new_posts = check_reddit(subreddit_name)
        send_email(f"r/{subreddit_name} 的新帖子", new_posts)




6. 网页转电子书
图片
实现思路

使用 BeautifulSoup 和 ebooklib 库提取网页内容并生成 EPUB 文件。
        
        import requests
        from bs4 import BeautifulSoup
        from ebooklib import epub
        URL = 'https://example.com/article'
        EPUB_NAME = 'article.epub'
        def get_web_content(url):
            # 获取网页内容
            response = requests.get(url)
            soup = BeautifulSoup(response.content, 'html.parser')
            content = soup.find('div', class_='content').get_text()
            return content
        def create_epub(content, epub_name):
            # 创建 EPUB 文件
            book = epub.EpubBook()
            book.set_identifier('id123456')
            book.set_title('文章标题')
            book.set_language('en')
            book.add_author('作者名')
            c1 = epub.EpubHtml(title='第一章', file_name='chap_01.xhtml',)
            c1.content = '第一章' + content + ''
            book.add_item(c1)
            book.toc = (epub.Link('chap_01.xhtml', '第一章', 'chap_01'),)
            book.add_item(epub.EpubNcx())
            book.add_item(epub.EpubNav())
            book.spine = ['nav', c1]
            epub.write_epub(epub_name, book, {})
        content = get_web_content(URL)
        create_epub(content, EPUB_NAME)
        print(f"EPUB 文件已生成: {EPUB_NAME}")




7. 文本转语音
图片
实现思路

使用 gTTS 库将文本转换为语音。
        
        from gtts import gTTS
        import os
        text = "你好，这是一个文本转语音的例子。"
        language = 'zh-cn'
        output_file = 'output.mp3'
        tts = gTTS(text=text,)
        tts.save(output_file)
        os.system(f"start {output_file}")  # 在 Windows 上播放 MP3 文件
        print(f"语音文件已生成: {output_file}")




8. 网站可用性检测
图片
实现思路

使用 requests 库发送 HTTP 请求，检查网站的响应状态。
        
        import requests
        import time
        def check_website(url):
            # 检查网站的可用性
            try:
                response = requests.get(url)
                if response.status_code == 200:
                    return "网站正常运行。"
                else:
                    return f"网站返回状态码: {response.status_code}"
            except requests.exceptions.RequestException as e:
                return f"网站宕机: {e}"
        url = 'https://example.com'
        while True:
            status = check_website(url)
            print(status)
            time.sleep(300)  # 每 5 分钟检查一次




9. 跟踪加密货币价格
图片
实现思路

使用 CoinGecko API 获取加密货币的价格。

定期检查价格并打印或发送通知。
        
        import requests
        import time
        def get_crypto_price(crypto_id, currency='usd'):
            url = f"https://api.coingecko.com/api/v3/simple/price?ids={crypto_id}&vs_currencies={currency}"
            response = requests.get(url)
            data = response.json()
            price = data[crypto_id][currency]
            return price
        def track_crypto_price(crypto_id, interval=60):
            while True:
                price = get_crypto_price(crypto_id)
                print(f"{crypto_id} 当前价格: {price} USD")
                time.sleep(interval)
        crypto_id = 'bitcoin'
        track_crypto_price(crypto_id)




10. 下载完成自动关机
图片
实现思路

监听下载任务的状态，当任务完成时关闭计算机。
        
        import os
        import time
        def check_download_complete(download_dir, target_file):
            # 检查下载文件是否完成
            file_path = os.path.join(download_dir, target_file)
            if os.path.exists(file_path):
                return True
            return False
        def auto_shutdown(download_dir, target_file, interval=10):
            while True:
                if check_download_complete(download_dir, target_file):
                    print("下载完成，即将关机...")
                    os.system("shutdown /s /t 1")  # Windows 关机命令
                    break
                time.sleep(interval)
        download_dir = "/path/to/your/downloads"
        target_file = "example.zip"
        auto_shutdown(download_dir, target_file)




11. 脚本密码保护
图片
实现思路

使用 getpass 模块获取用户输入的密码。

比较输入的密码和预设的密码，验证通过后执行脚本。
        
        import getpass
        def password_protect(script_password):
            user_password = getpass.getpass("请输入密码: ")
            if user_password == script_password:
                print("密码正确，脚本开始执行...")
                # 这里放置你的脚本逻辑
            else:
                print("密码错误，脚本终止。")
        script_password = "your_password"
        password_protect(script_password)




12. 监控CPU使用率
图片
实现思路

使用 psutil 库获取 CPU 使用率。

定期检查 CPU 使用率并打印或发送通知。
        
        import psutil
        import time
        def monitor_cpu_usage(interval=10):
            while True:
                cpu_usage = psutil.cpu_percent(interval=1)
                print(f"当前 CPU 使用率: {cpu_usage}%")
                time.sleep(interval)
        monitor_cpu_usage()




13. PDF转文本
图片
实现思路

使用 PyPDF2 库读取 PDF 文件内容。

将内容保存为文本文件。
        
        import PyPDF2
        def pdf_to_text(pdf_file, text_file):
            with open(pdf_file, 'rb') as file:
                reader = PyPDF2.PdfFileReader(file)
                text = ""
                for page_num in range(reader.numPages):
                    page = reader.getPage(page_num)
                    text += page.extractText()
            with open(text_file, 'w', encoding='utf-8') as file:
                file.write(text)
            print(f"PDF 转换完成: {pdf_file} -> {text_file}")
        pdf_file = "example.pdf"
        text_file = "example.txt"
        pdf_to_text(pdf_file, text_file)




14. 生成二维码
图片
实现思路

使用 qrcode 库生成二维码。

保存二维码为图像文件。
        
        import qrcode
        def generate_qr_code(data, output_file):
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(data)
            qr.make(fit=True)
            img = qr.make_image(fill='black', back_color='white')
            img.save(output_file)
            print(f"二维码已生成: {output_file}")
        data = "https://example.com"
        output_file = "qrcode.png"
        generate_qr_code(data, output_file)




15. 下载YouTube视频
图片
实现思路

使用 pytube 库下载 YouTube 视频。

选择视频的分辨率并保存。
        
        from pytube import YouTube
        def download_youtube_video(url, output_path, resolution='720p'):
            yt = YouTube(url)
            stream = yt.streams.filter(res=resolution).first()
            stream.download(output_path)
            print(f"视频已下载: {url} -> {output_path}")
        url = "https://www.youtube.com/watch?v=example"
        output_path = "/path/to/your/downloads"
        download_youtube_video(url, output_path)
        



16. 创建随机强密码
图片
实现思路

使用 random 和 string 模块生成随机密码。

确保密码包含大写字母、小写字母、数字和特殊字符。
        
        import random
        import string
        def generate_strong_password(length=12):
            characters = string.ascii_letters + string.digits + string.punctuation
            password = ''.join(random.choice(characters) for _ in range(length))
            print(f"生成的强密码: {password}")
            return password
        generate_strong_password()




17. 获取实时股票价格
图片
实现思路

使用 Alpha Vantage API 获取股票价格。

定期检查价格并打印或发送通知。
        
        import requests
        import time
        API_KEY = 'your_alpha_vantage_api_key'
        SYMBOL = 'AAPL'
        URL = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={SYMBOL}&apikey={API_KEY}"
        def get_stock_price(symbol):
            response = requests.get(URL)
            data = response.json()
            if 'Global Quote' in data:
                price = data['Global Quote']['05. price']
                return float(price)
            else:
                return None
        def track_stock_price(symbol, interval=60):
            while True:
                price = get_stock_price(symbol)
                if price is not None:
                    print(f"{symbol} 当前价格: {price} USD")
                else:
                    print(f"未能获取 {symbol} 的价格")
                time.sleep(interval)
        track_stock_price(SYMBOL)




18. 创建简单聊天机器人
图片
实现思路

使用简单的规则匹配和响应机制。

可以使用 if-else 语句或正则表达式来处理用户输入。
        
        import re
        def simple_chatbot():
            print("欢迎来到简单聊天机器人！输入 '退出' 结束对话。")
            while True:
                user_input = input("你: ")
                if user_input.lower() == '退出':
                    print("再见！")
                    break
                elif re.search(r'\b你好\b', user_input, re.IGNORECASE):
                    print("机器人: 你好！有什么我可以帮你的吗？")
                elif re.search(r'\b天气\b', user_input, re.IGNORECASE):
                    print("机器人: 今天的天气很好，适合外出。")
                else:
                    print("机器人: 对不起，我不太明白你的意思。")
        simple_chatbot()
        



19. 每日步数跟踪
图片
实现思路

使用 Fitbit API 或其他健康数据 API 获取用户的步数。

定期检查步数并记录。
        
        import requests
        import time
        API_KEY = 'your_fitbit_api_key'
        USER_ID = 'your_fitbit_user_id'
        URL = f"https://api.fitbit.com/1/user/{USER_ID}/activities/steps/date/today/1d.json"
        def get_daily_steps():
            headers = {
                'Authorization': f'Bearer {API_KEY}'
            }
            response = requests.get(URL, headers=headers)
            data = response.json()
            if 'activities-steps' in data:
                steps = int(data['activities-steps'][0]['value'])
                return steps
            else:
                return None
        def track_daily_steps(interval=3600):
            while True:
                steps = get_daily_steps()
                if steps is not None:
                    print(f"今日步数: {steps}")
                else:
                    print("未能获取步数数据")
                time.sleep(interval)
        track_daily_steps()




20. 创建待办事项列表
图片
实现思路

使用简单的文件操作来存储和读取待办事项。

提供添加、删除和查看待办事项的功能。

        def add_todo(todo, todo_file="todos.txt"):
            with open(todo_file, 'a') as file:
                file.write(todo + '\n')
            print(f"已添加待办事项: {todo}")
        def remove_todo(todo, todo_file="todos.txt"):
            with open(todo_file, 'r') as file:
                todos = file.readlines()
            with open(todo_file, 'w') as file:
                for item in todos:
                    if item.strip() != todo:
                        file.write(item)
            print(f"已删除待办事项: {todo}")
        def view_todos(todo_file="todos.txt"):
            with open(todo_file, 'r') as file:
                todos = file.readlines()
            if todos:
                print("待办事项列表:")
                for index, item in enumerate(todos, start=1):
                    print(f"{index}. {item.strip()}")
            else:
                print("暂无待办事项。")
        def main():
            while True:
                print("\n1. 添加待办事项")
                print("2. 删除待办事项")
                print("3. 查看待办事项")
                print("4. 退出")
                choice = input("请选择操作: ")
                if choice == '1':
                    todo = input("请输入待办事项: ")
                    add_todo(todo)
                elif choice == '2':
                    todo = input("请输入要删除的待办事项: ")
                    remove_todo(todo)
                elif choice == '3':
                    view_todos()
                elif choice == '4':
                    print("再见！")
                    break
                else:
                    print("无效的选择，请重新输入。")
        if __name__ == "__main__":
            main()
