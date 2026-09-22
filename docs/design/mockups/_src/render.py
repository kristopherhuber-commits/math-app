import asyncio, glob, os, sys
from playwright.async_api import async_playwright
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..")
async def main(files):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width":1280,"height":800})
        import re
        for f in files:
            m=re.search(r'width="(\d+)" height="(\d+)"', open(f).read())
            await pg.set_viewport_size({"width":int(m.group(1)),"height":int(m.group(2))})
            await pg.goto("file://"+f)
            await pg.screenshot(path=f.replace(".svg",".png"))
        await b.close()
files = sys.argv[1:] or sorted(glob.glob(OUT+"/*.svg"))
asyncio.run(main(files))
