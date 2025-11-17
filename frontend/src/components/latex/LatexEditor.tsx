import Editor from '@monaco-editor/react';

interface LatexEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  readOnly?: boolean;
}

export function LatexEditor({ value, onChange, readOnly = false }: LatexEditorProps) {
  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage="latex"
        value={value}
        onChange={onChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          wordWrap: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          readOnly,
          padding: { top: 16, bottom: 16 },
        }}
      />
    </div>
  );
}
