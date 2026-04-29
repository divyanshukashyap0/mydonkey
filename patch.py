import sys

with open('AppNew.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = "        if (activeTab === 'search') {\n            return <SearchPage onDetails={handleDetails} />;\n        }"
target2 = "        if (activeTab === 'search') {\r\n            return <SearchPage onDetails={handleDetails} />;\r\n        }"

replacement = """        if (activeTab === 'search') {
            return <SearchPage onDetails={handleDetails} />;
        }

        if (activeTab === 'imdb') {
            return <IMDbStreamPage />;
        }"""

if target in content:
    content = content.replace(target, replacement)
elif target2 in content:
    content = content.replace(target2, replacement.replace('\n', '\r\n'))

with open('AppNew.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched successfully')
