const fs = require('fs');

const content = fs.readFileSync('AppNew.tsx', 'utf8');

const target1 = "        if (activeTab === 'search') {\n            return <SearchPage onDetails={handleDetails} />;\n        }";
const target2 = "        if (activeTab === 'search') {\r\n            return <SearchPage onDetails={handleDetails} />;\r\n        }";

const replacement = `        if (activeTab === 'search') {
            return <SearchPage onDetails={handleDetails} />;
        }

        if (activeTab === 'imdb') {
            return <IMDbStreamPage />;
        }`;

let newContent = content;
if (content.includes(target1)) {
    newContent = content.replace(target1, replacement);
} else if (content.includes(target2)) {
    newContent = content.replace(target2, replacement.replace(/\n/g, '\r\n'));
} else {
    console.log("Target not found!");
}

fs.writeFileSync('AppNew.tsx', newContent, 'utf8');
console.log("Done");
