import { Terminal } from 'xterm';
import { isUndefined, isNull } from 'lodash';
import * as io from 'socket.io-client';
import { fit } from 'xterm/lib/addons/fit/fit';
import './wetty.scss';
import './favicon.ico';

const userRegex = new RegExp('ssh/[^/]+$');
const trim = (str: string): string => str.replace(/\/*$/, '');
const socketBase = trim(window.location.pathname).replace(userRegex, '');
const socket = io(window.location.origin, {
  path: `${trim(socketBase)}/socket.io`,
});

const overlay = document.getElementById('overlay');
const terminal = document.getElementById('terminal');

socket.on('connect', () => {
  const term = new Terminal();
  if (isNull(terminal)) return;
  term.open(terminal);
  term.setOption('fontSize', 14);
  if (!isNull(overlay)) overlay.style.display = 'none';
  window.addEventListener('beforeunload', handler, false);
  /*
    term.scrollPort_.screen_.setAttribute('contenteditable', 'false');
  */

  term.attachCustomKeyEventHandler(e => {
    // Ctrl + Shift + C
    if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
      e.preventDefault();
      document.execCommand('copy');
      return false;
    }
    return true;
  });

  function resize(): void {
    fit(term);
    socket.emit('resize', { cols: term.cols, rows: term.rows });
  }
  window.onresize = resize;
  resize();
  term.focus();

  function kill(data: string): void {
    disconnect(data);
  }

  term.on('data', data => {
    socket.emit('input', data);
  });
  term.on('resize', size => {
    socket.emit('resize', size);
  });
  socket
    .on('data', (data: string) => {
      term.write(data);
    })
    .on('login', () => {
      term.writeln('');
      resize();
    })
    .on('logout', kill)
    .on('disconnect', kill)
    .on('error', (err: string | null) => {
      if (err) disconnect(err);
    });
});

function disconnect(reason: string): void {
  if (isNull(overlay)) return;
  overlay.style.display = 'block';
  const msg = document.getElementById('msg');
  if (!isUndefined(reason) && !isNull(msg)) msg.innerHTML = reason;
  window.removeEventListener('beforeunload', handler, false);
}

function handler(e: { returnValue: string }): string {
  e.returnValue = 'Are you sure?';
  return e.returnValue;
}
