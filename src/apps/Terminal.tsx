import React, { useState, useRef, useEffect } from 'react';

interface HistoryEntry {
  type: 'input' | 'output';
  text: string;
}

const FS: Record<string, string[]> = {
  'C:\\': ['Documents', 'Program Files', 'Windows', 'Users'],
  'C:\\Documents': ['readme.txt', 'notes.txt'],
};

export default function Terminal() {
  const [history, setHistory] = useState<HistoryEntry[]>([
    { type: 'output', text: 'Microsoft Windows XP [Version 5.1.2600]' },
    { type: 'output', text: '(C) Copyright 1985-2001 Microsoft Corp.' },
    { type: 'output', text: '' },
  ]);
  const [input, setInput] = useState('');
  const [cwd, setCwd] = useState('C:\\');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const prompt = `${cwd}> `;

  const runCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    const parts = trimmed.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    const addOutput = (...lines: string[]) =>
      setHistory((h) => [...h, ...lines.map((text) => ({ type: 'output' as const, text }))]);

    switch (command) {
      case '':
        break;
      case 'help':
        addOutput(
          'Available commands:',
          '  help              Show this help message',
          '  echo [text]       Print text to the terminal',
          '  date              Show current date and time',
          '  clear             Clear the terminal screen',
          '  ls                List files in current directory',
          '  dir               List files in current directory',
          '  cd [path]         Change directory',
          '  whoami            Show current user',
          '  ver               Show OS version',
          '  cls               Clear the terminal screen',
          ''
        );
        break;
      case 'echo':
        addOutput(args || '');
        break;
      case 'date':
        addOutput(new Date().toString());
        break;
      case 'clear':
      case 'cls':
        setHistory([]);
        break;
      case 'ls':
      case 'dir': {
        const files = FS[cwd] || ['Access denied or empty directory.'];
        addOutput(` Directory of ${cwd}`, '', ...files.map((f) => `  ${f}`), '');
        break;
      }
      case 'cd': {
        if (!args || args === '..') {
          const parts2 = cwd.split('\\').filter(Boolean);
          if (parts2.length > 1) {
            parts2.pop();
            const newCwd = parts2.join('\\') + '\\';
            setCwd(newCwd.startsWith('C:') ? newCwd : 'C:\\');
          }
        } else {
          const newPath = args.includes(':') ? args : `${cwd}${args}`;
          if (FS[newPath]) {
            setCwd(newPath.endsWith('\\') ? newPath : newPath + '\\');
          } else {
            addOutput(`The system cannot find the path specified.`);
          }
        }
        break;
      }
      case 'whoami':
        addOutput('WEBOS\\User');
        break;
      case 'ver':
        addOutput('', 'Microsoft Windows XP [Version 5.1.2600]', '');
        break;
      default:
        addOutput(`'${command}' is not recognized as an internal or external command,`, 'operable program or batch file.', '');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const cmd = input;
      setHistory((h) => [...h, { type: 'input', text: `${prompt}${cmd}` }]);
      setCmdHistory((h) => [cmd, ...h]);
      setHistIdx(-1);
      setInput('');
      runCommand(cmd);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(newIdx);
      setInput(cmdHistory[newIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = Math.max(histIdx - 1, -1);
      setHistIdx(newIdx);
      setInput(newIdx === -1 ? '' : cmdHistory[newIdx]);
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      style={{
        background: '#000000',
        color: '#c0c0c0',
        fontFamily: '"Lucida Console", "Courier New", monospace',
        fontSize: 13,
        padding: 8,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'text',
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {history.map((entry, i) => (
          <div
            key={i}
            style={{ color: entry.type === 'input' ? '#ffffff' : '#c0c0c0', lineHeight: '1.4' }}
          >
            {entry.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', color: '#ffffff' }}>
        <span>{prompt}</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#ffffff',
            fontFamily: '"Lucida Console", "Courier New", monospace',
            fontSize: 13,
            caretColor: '#ffffff',
          }}
        />
      </div>
    </div>
  );
}
