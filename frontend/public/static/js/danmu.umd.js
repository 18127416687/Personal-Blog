/*!
 * danmu.js
 * (c) 2024-2026 Imtaotao
 * Released under the MIT License.
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined'
    ? factory(exports)
    : typeof define === 'function' && define.amd
      ? define(['exports'], factory)
      : ((global =
          typeof globalThis !== 'undefined' ? globalThis : global || self),
        factory((global.Danmu = {})));
})(this, function (exports) {
  'use strict';

  class Queue {
    constructor() {
      this._fx = [];
      this._init = true;
      this._lock = false;
      this._finishDefers = new Set();
    }
    _next() {
      if (!this._lock) {
        this._lock = true;
        if (this._fx.length === 0) {
          this._init = true;
          this._finishDefers.forEach((d) => d.resolve());
          this._finishDefers.clear();
        } else {
          const fn = this._fx.shift();
          if (fn) {
            fn(() => {
              this._lock = false;
              this._next();
            });
          }
        }
      }
    }
    add(fn) {
      this._fx.push(fn);
      if (this._init) {
        this._lock = false;
        this._init = false;
        this._next();
      }
    }
    awaitFinish() {
      if (this._init) return Promise.resolve();
      const defer = {};
      this._finishDefers.add(defer);
      return new Promise((resolve) => {
        defer.resolve = resolve;
      });
    }
  }

  const objectToString = Object.prototype.toString;
  const toRawType = (val) => {
    return objectToString.call(val).slice(8, -1).toLowerCase();
  };
  const isArray = (() => Array.isArray)();
  const isObject = (val) => {
    return val !== null && typeof val === 'object';
  };
  const isNumber = (val) => {
    return typeof val === 'number';
  };
  const isPromiseLike = (val) => {
    return isObject(val) && typeof val.then === 'function';
  };
  const isPlainObject = (val) => {
    return objectToString.call(val) === '[object Object]';
  };
  const isSet =
    typeof Set !== 'function' || !(() => Set.prototype.has)()
      ? () => false
      : (v) => isObject(v) && v instanceof Set;
  const isInBounds = ([a, b], val) => {
    if (val === a || val === b) return true;
    const min = Math.min(a, b);
    const max = min === a ? b : a;
    return min < val && val < max;
  };
  const isEmptyObject = (val) => {
    for (const _ in val) return false;
    return true;
  };
  const isPrimitiveValue = (val) => {
    return (
      typeof val === 'number' ||
      typeof val === 'bigint' ||
      typeof val === 'string' ||
      typeof val === 'symbol' ||
      typeof val === 'boolean' ||
      val === undefined ||
      val === null
    );
  };
  const isWhitespace = (char) => {
    return (
      char === ' ' ||
      char === '\t' ||
      char === '\n' ||
      char === '\r' ||
      char === '\f' ||
      char === '\v'
    );
  };
  let byteToHex;
  const unsafeStringify = (arr) => {
    if (!byteToHex) {
      byteToHex = [];
      for (let i = 0; i < 256; ++i) {
        byteToHex.push((i + 0x100).toString(16).slice(1));
      }
    }
    return (
      byteToHex[arr[0]] +
      byteToHex[arr[1]] +
      byteToHex[arr[2]] +
      byteToHex[arr[3]] +
      '-' +
      byteToHex[arr[4]] +
      byteToHex[arr[5]] +
      '-' +
      byteToHex[arr[6]] +
      byteToHex[arr[7]] +
      '-' +
      byteToHex[arr[8]] +
      byteToHex[arr[9]] +
      '-' +
      byteToHex[arr[10]] +
      byteToHex[arr[11]] +
      byteToHex[arr[12]] +
      byteToHex[arr[13]] +
      byteToHex[arr[14]] +
      byteToHex[arr[15]]
    ).toLowerCase();
  };
  let poolPtr;
  let rnds8Pool;
  const rng = () => {
    if (!rnds8Pool) {
      rnds8Pool = new Uint8Array(256);
      poolPtr = rnds8Pool.length;
    }
    if (poolPtr > 256 - 16) {
      for (let i = 0; i < 256; i++) {
        rnds8Pool[i] = Math.floor(Math.random() * 256);
      }
      poolPtr = 0;
    }
    return rnds8Pool.slice(poolPtr, (poolPtr += 16));
  };
  const uuid = () => {
    const rnds = rng();
    rnds[6] = (rnds[6] & 0x0f) | 0x40;
    rnds[8] = (rnds[8] & 0x3f) | 0x80;
    return unsafeStringify(rnds);
  };
  const loopSlice = (l, fn, taskTime = 17) => {
    return new Promise((resolve) => {
      if (l === 0) {
        resolve();
        return;
      }
      let i = -1;
      let start = Date.now();
      const run = () => {
        while (++i < l) {
          if (fn(i) === false) {
            resolve();
            break;
          }
          if (i === l - 1) {
            resolve();
          } else {
            const t = Date.now();
            if (t - start > taskTime) {
              start = t;
              raf(run);
              break;
            }
          }
        }
      };
      run();
    });
  };
  class Calculator {
    expr;
    i = 0;
    priority = {
      '+': 1,
      '-': 1,
      '*': 2,
      '/': 2,
      '%': 2,
    };
    constructor(expr) {
      this.expr = expr;
    }
    calculateOperation(numbers, operator) {
      const b = numbers.pop();
      const a = numbers.pop();
      if (a !== undefined && b !== undefined) {
        switch (operator) {
          case '+':
            numbers.push(a + b);
            break;
          case '-':
            numbers.push(a - b);
            break;
          case '*':
            numbers.push(a * b);
            break;
          case '/':
            numbers.push(a / b);
            break;
          case '%':
            numbers.push(a % b);
            break;
          default:
            throw new Error(`Invalid operator: "${operator}"`);
        }
      }
    }
    evaluate(tokens) {
      if (tokens.length === 0) return NaN;
      const numbers = [];
      const operators = [];
      for (const token of tokens) {
        if (typeof token === 'string') {
          const cur = this.priority[token];
          while (
            operators.length > 0 &&
            this.priority[last(operators)] >= cur
          ) {
            this.calculateOperation(numbers, operators.pop());
          }
          operators.push(token);
        } else {
          numbers.push(token);
        }
      }
      while (operators.length > 0) {
        this.calculateOperation(numbers, operators.pop());
      }
      const n = numbers.pop();
      return typeof n === 'number' ? n : NaN;
    }
    tokenizer() {
      const tokens = [];
      if (!this.expr) return tokens;
      let buf = '';
      const add = () => {
        if (buf) {
          tokens.push(Number(buf));
          buf = '';
        }
      };
      for (; this.i < this.expr.length; this.i++) {
        const char = this.expr[this.i];
        if (isWhitespace(char));
        else if (char === '+' || char === '-') {
          const prevToken = last(tokens);
          if (!buf && (!prevToken || prevToken in this.priority)) {
            buf += char;
          } else {
            add();
            tokens.push(char);
          }
        } else if (char === '*' || char === '/' || char === '%') {
          add();
          tokens.push(char);
        } else if (char === '(') {
          this.i++;
          tokens.push(this.evaluate(this.tokenizer()));
        } else if (char === ')') {
          this.i++;
          add();
          return tokens;
        } else {
          buf += char;
        }
      }
      add();
      return tokens;
    }
  }
  const isLegalExpression = (expr) => {
    const keywords = '\',",`,:,;,[,{,=,var,let,const,return'.split(',');
    for (const word of keywords) {
      if (expr.includes(word)) {
        return false;
      }
    }
    return !/[^\+\-\*\/\%\s]+\(/.test(expr);
  };
  const mathExprEvaluate = (expr, options) => {
    const { units, verify, actuator, exec = true } = options || {};
    if (verify && !isLegalExpression(expr)) {
      throw new Error(`Invalid expression: "${expr}"`);
    }
    expr = expr.replace(
      /(-?\d+(\.\d+)?|NaN|Infinity)([^\d\s\+\-\*\/\.\(\)]+)?/g,
      ($1, n, $3, u, $4) => {
        if (!u) return n;
        const parser = units && (units[u] || units['default']);
        if (!parser) throw new Error(`Invalid unit: "${u}"`);
        return String(parser(n, u, expr));
      },
    );
    try {
      if (actuator) {
        return actuator(expr, Boolean(exec));
      } else {
        if (!exec) return expr;
        const calculator = new Calculator(expr);
        return calculator.evaluate(calculator.tokenizer());
      }
    } catch (e) {
      throw new Error(`Invalid expression: "${expr}", error: "${e}"`);
    }
  };
  function assert(condition, error) {
    if (!condition) throw new Error(error);
  }
  const raf = (fn) => {
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame(fn)
      : typeof process !== 'undefined' && typeof process.nextTick === 'function'
        ? process.nextTick(fn)
        : setTimeout(fn, 17);
  };
  const now = () =>
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  const last = (arr, i = 0) => {
    return arr[arr.length + i - 1];
  };
  const hasOwn = (obj, key) => {
    return Object.hasOwnProperty.call(obj, key);
  };
  const decimalPlaces = (n) =>
    !Number.isFinite(n) || Number.isInteger(n)
      ? 0
      : String(n).split('.')[1].length;
  const random = (min = 0, max = 0) => {
    if (max === min) return max;
    if (max < min) min = [max, (max = min)][0];
    const n = Number(
      (Math.random() * (max - min) + min).toFixed(
        Math.max(decimalPlaces(min), decimalPlaces(max)),
      ),
    );
    if (n > max) return max;
    if (n < min) return min;
    return n;
  };
  const once = (fn) => {
    let result;
    let called = false;
    function wrap(...args) {
      if (called) return result;
      called = true;
      result = fn.apply(this, args);
      return result;
    }
    return wrap;
  };
  const remove = (arr, el) => {
    if (isArray(arr)) {
      const i = arr.indexOf(el);
      if (i > -1) {
        arr.splice(i, 1);
        return true;
      }
      return false;
    } else {
      if (arr.has(el)) {
        arr.delete(el);
        return true;
      }
      return false;
    }
  };
  function map(data, fn) {
    fn = fn || ((val) => val);
    if (isArray(data)) {
      return data.map((val, i) => fn(val, i));
    }
    if (isSet(data)) {
      const cloned = new Set();
      for (const val of data) {
        cloned.add(fn(val));
      }
      return cloned;
    }
    if (isPlainObject(data)) {
      const cloned = {};
      for (const key in data) {
        cloned[key] = fn(data[key], key);
      }
      return cloned;
    }
    throw new Error(`Invalid type "${toRawType(data)}"`);
  }
  const pick = (val, keys, omitUndefined = false) => {
    return keys.reduce((n, k) => {
      if (k in val) {
        if (!omitUndefined || val[k] !== undefined) {
          n[k] = val[k];
        }
      }
      return n;
    }, {});
  };
  const omit = (val, keys) => {
    return Object.keys(val).reduce((n, k) => {
      if (!keys.includes(k)) {
        n[k] = val[k];
      }
      return n;
    }, {});
  };
  const deferred = () => {
    let reject;
    let resolve;
    const promise = new Promise((rs, rj) => {
      reject = rj;
      resolve = rs;
    });
    return { promise, resolve, reject };
  };
  const batchProcess = ({ ms, processor }) => {
    const queue = [];
    const flush = () => {
      setTimeout(() => {
        const ls = [];
        const fns = [];
        for (const { value, resolve } of queue) {
          ls.push(value);
          fns.push(resolve);
        }
        queue.length = 0;
        processor(ls);
        for (const fn of fns) {
          fn();
        }
      }, ms || 0);
    };
    return (value) => {
      const defer = deferred();
      if (queue.length === 0) flush();
      queue.push({ value, resolve: defer.resolve });
      return defer.promise;
    };
  };

  class Track {
    _container;
    isLock = false;
    index;
    location;
    list;
    constructor({ index, list, location, container }) {
      this.list = list;
      this.index = index;
      this.location = location;
      this._container = container;
    }
    get width() {
      return this._container.width;
    }
    get height() {
      return this.location.bottom - this.location.top;
    }
    // We have to make a copy.
    // During the loop, there are too many factors that change danmaku,
    // which makes it impossible to guarantee the stability of the list.
    each(fn) {
      for (const dm of Array.from(this.list)) {
        if (fn(dm) === false) break;
      }
    }
    lock() {
      this.isLock = true;
    }
    unlock() {
      this.isLock = false;
    }
    clear() {
      this.each((dm) => dm.destroy());
    }
    /**
     * @internal
     */
    _add(dm) {
      this.list.push(dm);
    }
    /**
     * @internal
     */
    _remove(dm) {
      remove(this.list, dm);
    }
    /**
     * @internal
     */
    _updateLocation(location) {
      this.location = location;
    }
    /**
     * @internal
     */
    _last(li) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const dm = this.list[i - li];
        if (dm && !dm.paused && dm.loops === 0 && dm.type === 'facile') {
          return dm;
        }
      }
      return null;
    }
  }

  const INTERNAL_FLAG = Symbol();
  const ids = {
    danmu: 1,
    bridge: 1,
    runtime: 1,
    container: 1,
  };
  const nextFrame = (fn) => raf(() => raf(fn));
  const getTrackIdx = (founds, rows, distribution = 'random') => {
    if (distribution === 'order') {
      for (let i = 0; i < rows; i++) {
        if (!founds.has(i)) {
          return i;
        }
      }
    }
    const n = getTrackRandomIdx(rows);
    return founds.has(n) ? getTrackIdx(founds, rows, distribution) : n;
  };
  const getTrackRandomIdx = (rows) => {
    const n = Math.floor(Math.random() * rows);
    return n;
  };
  const toNumber = (val, all) => {
    return mathExprEvaluate(val, {
      units: {
        px: (n) => n,
        '%': (n) => (Number(n) / 100) * all,
      },
    });
  };
  const whenTransitionEnds = (node) => {
    return new Promise((resolve) => {
      const onEnd = once(() => {
        node.removeEventListener('transitionend', onEnd);
        resolve();
      });
      node.addEventListener('transitionend', onEnd);
    });
  };

  class Container {
    width = 0;
    height = 0;
    node;
    parentNode = null;
    _parentWidth = 0;
    _parentHeight = 0;
    _size = {
      x: { start: 0, end: '100%' },
      y: { start: 0, end: '100%' },
    };
    constructor() {
      this.node = document.createElement('div');
      this.node.setAttribute('data-danmu-container', String(ids.container++));
      this.setStyle('overflow', 'hidden');
      this.setStyle('position', 'relative');
      this.setStyle('top', '0');
      this.setStyle('left', '0');
    }
    /**
     * @internal
     */
    _sizeToNumber() {
      const size = Object.create(null);
      const transform = (v, all) => {
        return typeof v === 'string' ? (v ? toNumber(v, all) : 0) : v;
      };
      size.x = map(this._size.x, (v) => transform(v, this._parentWidth));
      size.y = map(this._size.y, (v) => transform(v, this._parentHeight));
      return size;
    }
    /**
     * @internal
     */
    _mount(node) {
      this._unmount();
      this.parentNode = node;
      this._format();
      this.parentNode.appendChild(this.node);
    }
    /**
     * @internal
     */
    _unmount() {
      this.parentNode = null;
      if (this.node.parentNode) {
        this.node.parentNode.removeChild(this.node);
      }
    }
    /**
     * @internal
     */
    _updateSize({ x, y }) {
      const isLegal = (v) => {
        return typeof v === 'string' || typeof v === 'number';
      };
      if (x) {
        if (isLegal(x.end)) this._size.x.end = x.end;
        if (isLegal(x.start)) this._size.x.start = x.start;
      }
      if (y) {
        if (isLegal(y.end)) this._size.y.end = y.end;
        if (isLegal(y.start)) this._size.y.start = y.start;
      }
    }
    /**
     * @internal
     */
    _toNumber(p, val) {
      let n = typeof val === 'number' ? val : toNumber(val, this[p]);
      if (n > this[p]) n = this[p];
      assert(!Number.isNaN(n), `${val} is not a number`);
      return n;
    }
    /**
     * @internal
     */
    _format() {
      if (this.parentNode) {
        const styles = getComputedStyle(this.parentNode);
        this._parentWidth = Number(styles.width.replace('px', ''));
        this._parentHeight = Number(styles.height.replace('px', ''));
      }
      const { x, y } = this._sizeToNumber();
      this.width = x.end - x.start;
      this.height = y.end - y.start;
      this.setStyle('left', `${x.start}px`);
      this.setStyle('top', `${y.start}px`);
      this.setStyle('width', `${this.width}px`);
      this.setStyle('height', `${this.height}px`);
    }
    setStyle(key, val) {
      this.node.style[key] = val;
    }
  }

  const INTERNAL = Symbol('internal_hooks');
  const INVALID_VALUE = Symbol('invalid_condition_value');
  const PERFORMANCE_PLUGIN_PREFIX = '__performance_monitor__';
  const isBrowser = typeof window !== 'undefined';
  let taskId = 1;
  const createTaskId = () => taskId++;
  let monitorTaskId = 1;
  const createMonitorTaskId = () => monitorTaskId++;
  let monitorPluginId = 1;
  const createMonitorPluginId = () => monitorPluginId++;
  const checkReturnData = (originData, returnData) => {
    if (!isPlainObject(returnData)) return false;
    if (originData !== returnData) {
      for (const key in originData) {
        if (!(key in returnData)) {
          return false;
        }
      }
    }
    return true;
  };
  const getTargetInArgs = (key, args) => {
    let target = args;
    const parts = key.split('.');
    for (let i = 0, l = parts.length; i < l; i++) {
      if (!target) return INVALID_VALUE;
      let p = parts[i];
      if (p.startsWith('[') && p.endsWith(']')) {
        p = Number(p.slice(1, -1));
      }
      target = target[p];
    }
    return target;
  };
  class SyncHook {
    constructor(context, _type = 'SyncHook', _internal) {
      this.listeners = new Set();
      this.tags = new WeakMap();
      this.errors = new Set();
      this.type = _type;
      this._locked = false;
      this.context = typeof context === 'undefined' ? null : context;
      if (_internal !== INTERNAL) {
        this.before = new SyncHook(null, 'SyncHook', INTERNAL);
        this.after = new SyncHook(null, 'SyncHook', INTERNAL);
      }
    }
    _emitError(error, hook, tag) {
      if (this.errors.size > 0) {
        this.errors.forEach((fn) =>
          fn({
            tag,
            hook,
            error,
            type: this.type,
          }),
        );
      } else {
        throw error;
      }
    }
    isEmpty() {
      return this.listeners.size === 0;
    }
    lock() {
      this._locked = true;
      if (this.before) this.before.lock();
      if (this.after) this.after.lock();
      return this;
    }
    unlock() {
      this._locked = false;
      if (this.before) this.before.unlock();
      if (this.after) this.after.unlock();
      return this;
    }
    on(tag, fn) {
      assert(!this._locked, 'The current hook is now locked.');
      if (typeof tag === 'function') {
        fn = tag;
        tag = '';
      }
      assert(typeof fn === 'function', `Invalid parameter in "${this.type}".`);
      if (tag && typeof tag === 'string') {
        this.tags.set(fn, tag);
      }
      this.listeners.add(fn);
      return this;
    }
    once(tag, fn) {
      if (typeof tag === 'function') {
        fn = tag;
        tag = '';
      }
      const self = this;
      this.on(tag, function wrapper(...args) {
        self.remove(wrapper, INTERNAL);
        return fn.apply(this, args);
      });
      return this;
    }
    emit(...data) {
      var _a, _b, _c;
      if (this.listeners.size > 0) {
        const id = createTaskId();
        let map = null;
        if (
          !((_a = this.after) === null || _a === void 0 ? void 0 : _a.isEmpty())
        ) {
          map = Object.create(null);
        }
        (_b = this.before) === null || _b === void 0
          ? void 0
          : _b.emit(id, this.type, this.context, data);
        this.listeners.forEach((fn) => {
          const tag = this.tags.get(fn);
          if (map && tag) {
            map[tag] = Date.now();
          }
          const record = () => {
            if (map && tag) {
              map[tag] = Date.now() - map[tag];
            }
          };
          try {
            fn.apply(this.context, data);
            record();
          } catch (e) {
            record();
            this._emitError(e, fn, tag);
          }
        });
        (_c = this.after) === null || _c === void 0
          ? void 0
          : _c.emit(id, this.type, this.context, data, map);
      }
    }
    remove(fn, _flag) {
      if (_flag !== INTERNAL) {
        assert(!this._locked, 'The current hook is now locked.');
      }
      this.listeners.delete(fn);
      return this;
    }
    removeAll() {
      assert(!this._locked, 'The current hook is now locked.');
      this.listeners.clear();
      return this;
    }
    listenError(fn) {
      assert(!this._locked, 'The current hook is now locked.');
      this.errors.add(fn);
    }
    clone() {
      return new this.constructor(
        this.context,
        this.type,
        this.before ? null : INTERNAL,
      );
    }
  }
  class AsyncHook extends SyncHook {
    constructor(context) {
      super(context, 'AsyncHook');
    }
    emit(...data) {
      var _a, _b;
      let id;
      let result;
      const ls = Array.from(this.listeners);
      let map = null;
      if (ls.length > 0) {
        id = createTaskId();
        if (
          !((_a = this.after) === null || _a === void 0 ? void 0 : _a.isEmpty())
        ) {
          map = Object.create(null);
        }
        (_b = this.before) === null || _b === void 0
          ? void 0
          : _b.emit(id, this.type, this.context, data);
        let i = 0;
        const call = (prev) => {
          if (prev === false) {
            return false;
          } else if (i < ls.length) {
            let res;
            const fn = ls[i++];
            const tag = this.tags.get(fn);
            if (map && tag) {
              map[tag] = Date.now();
            }
            const record = () => {
              if (map && tag) {
                map[tag] = Date.now() - map[tag];
              }
            };
            try {
              res = fn.apply(this.context, data);
            } catch (e) {
              record();
              this._emitError(e, fn, tag);
              return call(prev);
            }
            return Promise.resolve(res)
              .finally(record)
              .then(call)
              .catch((e) => {
                this._emitError(e, fn, tag);
                return call(prev);
              });
          } else {
            return prev;
          }
        };
        result = call();
      }
      return Promise.resolve(result).then((result) => {
        var _a;
        if (ls.length > 0) {
          (_a = this.after) === null || _a === void 0
            ? void 0
            : _a.emit(id, this.type, this.context, data, map);
        }
        return result;
      });
    }
  }
  class SyncWaterfallHook extends SyncHook {
    constructor(context) {
      super(context, 'SyncWaterfallHook');
    }
    emit(data) {
      var _a, _b, _c;
      assert(
        isPlainObject(data),
        `"${this.type}" hook response data must be an object.`,
      );
      if (this.listeners.size > 0) {
        const id = createTaskId();
        let map = null;
        if (
          !((_a = this.after) === null || _a === void 0 ? void 0 : _a.isEmpty())
        ) {
          map = Object.create(null);
        }
        (_b = this.before) === null || _b === void 0
          ? void 0
          : _b.emit(id, this.type, this.context, [data]);
        for (const fn of this.listeners) {
          const tag = this.tags.get(fn);
          if (map && tag) {
            map[tag] = Date.now();
          }
          const record = () => {
            if (map && tag) {
              map[tag] = Date.now() - map[tag];
            }
          };
          try {
            const tempData = fn.call(this.context, data);
            assert(
              checkReturnData(data, tempData),
              `The return value of hook "${this.type}" is incorrect.`,
            );
            data = tempData;
            record();
          } catch (e) {
            record();
            this._emitError(e, fn, tag);
          }
        }
        (_c = this.after) === null || _c === void 0
          ? void 0
          : _c.emit(id, this.type, this.context, [data], map);
      }
      return data;
    }
  }
  class AsyncParallelHook extends SyncHook {
    constructor(context) {
      super(context, 'AsyncParallelHook');
    }
    emit(...data) {
      var _a, _b;
      let id;
      let map = null;
      const size = this.listeners.size;
      const taskList = [];
      if (size > 0) {
        id = createTaskId();
        if (
          !((_a = this.after) === null || _a === void 0 ? void 0 : _a.isEmpty())
        ) {
          map = Object.create(null);
        }
        (_b = this.before) === null || _b === void 0
          ? void 0
          : _b.emit(id, this.type, this.context, data);
        for (const fn of this.listeners) {
          taskList.push(
            Promise.resolve().then(() => {
              const tag = this.tags.get(fn);
              if (map && tag) {
                map[tag] = Date.now();
              }
              const record = () => {
                if (map && tag) {
                  map[tag] = Date.now() - map[tag];
                }
              };
              try {
                const res = fn.apply(this.context, data);
                if (isPromiseLike(res)) {
                  return Promise.resolve(res).catch((e) => {
                    record();
                    this._emitError(e, fn, tag);
                    return null;
                  });
                } else {
                  record();
                  return res;
                }
              } catch (e) {
                this._emitError(e, fn, tag);
                return null;
              }
            }),
          );
        }
      }
      return Promise.all(taskList).then(() => {
        var _a;
        if (size > 0) {
          (_a = this.after) === null || _a === void 0
            ? void 0
            : _a.emit(id, this.type, this.context, data, map);
        }
      });
    }
  }
  class AsyncWaterfallHook extends SyncHook {
    constructor(context) {
      super(context, 'AsyncWaterfallHook');
    }
    emit(data) {
      var _a, _b;
      assert(
        isPlainObject(data),
        `"${this.type}" hook response data must be an object.`,
      );
      let i = 0;
      let id;
      let map = null;
      const ls = Array.from(this.listeners);
      if (ls.length > 0) {
        id = createTaskId();
        if (
          !((_a = this.after) === null || _a === void 0 ? void 0 : _a.isEmpty())
        ) {
          map = Object.create(null);
        }
        (_b = this.before) === null || _b === void 0
          ? void 0
          : _b.emit(id, this.type, this.context, [data]);
        const call = (prev) => {
          if (prev === false) {
            return false;
          } else {
            assert(
              checkReturnData(data, prev),
              `The return value of hook "${this.type}" is incorrect.`,
            );
            data = prev;
            if (i < ls.length) {
              let res;
              const fn = ls[i++];
              const tag = this.tags.get(fn);
              if (map && tag) {
                map[tag] = Date.now();
              }
              const record = () => {
                if (map && tag) {
                  map[tag] = Date.now() - map[tag];
                }
              };
              try {
                res = fn.call(this.context, prev);
              } catch (e) {
                record();
                this._emitError(e, fn, tag);
                return call(prev);
              }
              return Promise.resolve(res)
                .finally(record)
                .then(call)
                .catch((e) => {
                  this._emitError(e, fn, tag);
                  return call(prev);
                });
            }
          }
          return data;
        };
        return Promise.resolve(call(data)).then((data) => {
          var _a;
          (_a = this.after) === null || _a === void 0
            ? void 0
            : _a.emit(id, this.type, this.context, [data], map);
          return data;
        });
      } else {
        return Promise.resolve(data);
      }
    }
  }
  function createPerformance(plSys, defaultCondition) {
    let hooks = {};
    let closed = false;
    const pluginName = `${PERFORMANCE_PLUGIN_PREFIX}${createMonitorPluginId()}`;
    let records1 = new Map();
    let records2 = Object.create(null);
    let monitorTask = Object.create(null);
    const findCondition = (key, conditions) => {
      if (!conditions) return defaultCondition;
      return conditions[key] || defaultCondition;
    };
    for (const key in plSys.lifecycle) {
      hooks[key] = function (...args) {
        let value;
        for (const id in monitorTask) {
          const [sk, ek, conditions, hook] = monitorTask[id];
          const condition = findCondition(key, conditions);
          if (key === ek) {
            value = getTargetInArgs(condition, args);
            if (value !== INVALID_VALUE) {
              const prevObj = isPrimitiveValue(value)
                ? records2[value]
                : records1.get(value);
              if (prevObj) {
                const prevTime = prevObj[`${id}_${sk}`];
                if (typeof prevTime === 'number') {
                  hook.emit({
                    endArgs: args,
                    endContext: this,
                    events: [sk, ek],
                    equalValue: value,
                    time: Date.now() - prevTime,
                  });
                }
              }
            }
          }
          if (key === sk) {
            value = value || getTargetInArgs(condition, args);
            if (value !== INVALID_VALUE) {
              let obj;
              const k = `${id}_${sk}`;
              const t = Date.now();
              if (isPrimitiveValue(value)) {
                obj = records2[value];
                if (!obj) {
                  obj = Object.create(null);
                  records2[value] = obj;
                }
              } else {
                obj = records1.get(value);
                if (!obj) {
                  obj = Object.create(null);
                  records1.set(value, obj);
                }
              }
              obj[k] = t;
            }
          }
        }
      };
    }
    plSys.use({
      hooks,
      name: pluginName,
    });
    return {
      close() {
        if (!closed) {
          closed = true;
          records1.clear();
          records2 = Object.create(null);
          monitorTask = Object.create(null);
          this._taskHooks.hs.forEach((hook) => hook.removeAll());
          this._taskHooks.hs.clear();
          plSys.remove(pluginName);
        }
      },
      monitor(sk, ek, conditions) {
        assert(
          !closed,
          'Unable to add tasks to a closed performance observer.',
        );
        const id = createMonitorTaskId();
        const hook = new SyncHook();
        const task = [sk, ek, conditions, hook];
        monitorTask[id] = task;
        this._taskHooks.add(hook);
        return hook;
      },
      _taskHooks: {
        hs: new Set(),
        watch: new Set(),
        add(hook) {
          this.hs.add(hook);
          this.watch.forEach((fn) => fn(hook));
        },
      },
    };
  }
  function logPerformance(p, performanceReceiver, tag) {
    const _tag = `[${tag || 'debug'}_performance]`;
    const fn = (e) => {
      if (typeof performanceReceiver === 'function') {
        performanceReceiver({ tag, e });
      } else {
        console.log(
          `${_tag}(${e.events[0]} -> ${e.events[1]}): ${e.time}`,
          e.endArgs,
          e.endContext,
        );
      }
    };
    p._taskHooks.watch.add((hook) => hook.on(fn));
    p._taskHooks.hs.forEach((hook) => hook.on(fn));
  }
  function createDebugger(plSys, options) {
    let {
      tag,
      group,
      filter,
      receiver,
      listenError,
      logPluginTime,
      errorReceiver,
      performance,
      performanceReceiver,
    } = options;
    let unsubscribeError = null;
    let map = Object.create(null);
    const _tag = `[${tag || 'debug'}]: `;
    if (!('group' in options)) group = isBrowser;
    if (!('listenError' in options)) listenError = true;
    if (!('logPluginTime' in options)) logPluginTime = true;
    if (performance) logPerformance(performance, performanceReceiver, tag);
    const prefix = (e) => {
      let p = `${_tag}${e.name}_${e.id}(t, args, ctx`;
      p += logPluginTime ? ', pt)' : ')';
      return p;
    };
    const unsubscribeBefore = plSys.beforeEach((e) => {
      map[e.id] = { t: Date.now() };
      if (typeof receiver !== 'function') {
        console.time(prefix(e));
        if (group) console.groupCollapsed(e.name);
      }
    });
    const unsubscribeAfter = plSys.afterEach((e) => {
      let t = null;
      if (typeof filter === 'string') {
        if (e.name.startsWith(filter)) {
          if (group) console.groupEnd();
          return;
        }
      } else if (typeof filter === 'function') {
        t = Date.now() - map[e.id].t;
        if (filter({ e, tag, time: t })) {
          if (group) console.groupEnd();
          return;
        }
      }
      if (typeof receiver === 'function') {
        if (t === null) {
          t = Date.now() - map[e.id].t;
        }
        receiver({ e, tag, time: t });
      } else {
        console.timeLog(
          prefix(e),
          e.args,
          e.context,
          logPluginTime ? e.pluginExecTime : '',
        );
        if (group) console.groupEnd();
      }
    });
    if (listenError) {
      unsubscribeError = plSys.listenError((e) => {
        if (typeof errorReceiver === 'function') {
          errorReceiver(e);
        } else {
          console.error(
            `[${tag}]: The error originated from "${e.tag}.${e.name}(${e.type})".\n`,
            `The hook function is: ${String(e.hook)}\n\n`,
            e.error,
          );
        }
      });
    }
    return () => {
      unsubscribeBefore();
      unsubscribeAfter();
      if (unsubscribeError) {
        unsubscribeError();
      }
      map = Object.create(null);
      if (performance) {
        performance.close();
      }
    };
  }
  const HOOKS = {
    SyncHook,
    AsyncHook,
    AsyncParallelHook,
    SyncWaterfallHook,
    AsyncWaterfallHook,
  };
  class PluginSystem {
    constructor(lifecycle) {
      this._locked = false;
      this._debugs = new Set();
      this._performances = new Set();
      this._lockListenSet = new Set();
      this.plugins = Object.create(null);
      this.lifecycle = lifecycle || Object.create(null);
    }
    _onEmitLifeHook(type, fn) {
      assert(
        !this._locked,
        `The plugin system is locked and cannot add "${type}" hook.`,
      );
      let map = Object.create(null);
      for (const key in this.lifecycle) {
        map[key] = (id, type, context, args, map) => {
          fn(
            Object.freeze({
              id,
              type,
              args,
              context,
              name: key,
              pluginExecTime: map,
            }),
          );
        };
        this.lifecycle[key][type].on(map[key]);
      }
      return () => {
        for (const key in this.lifecycle) {
          this.lifecycle[key][type].remove(map[key]);
        }
        map = Object.create(null);
      };
    }
    listenLock(fn) {
      this._lockListenSet.add(fn);
    }
    lock() {
      this._locked = true;
      for (const key in this.lifecycle) {
        this.lifecycle[key].lock();
      }
      if (this._lockListenSet.size > 0) {
        this._lockListenSet.forEach((fn) => fn(true));
      }
    }
    unlock() {
      this._locked = false;
      for (const key in this.lifecycle) {
        this.lifecycle[key].unlock();
      }
      if (this._lockListenSet.size > 0) {
        this._lockListenSet.forEach((fn) => fn(false));
      }
    }
    beforeEach(fn) {
      return this._onEmitLifeHook('before', fn);
    }
    afterEach(fn) {
      return this._onEmitLifeHook('after', fn);
    }
    performance(defaultCondition) {
      assert(
        !this._locked,
        'The plugin system is locked and performance cannot be monitored.',
      );
      assert(
        defaultCondition && typeof defaultCondition === 'string',
        'A judgment `conditions` is required to use `performance`.',
      );
      const obj = createPerformance(this, defaultCondition);
      const { close } = obj;
      const fn = () => {
        assert(
          !this._locked,
          'The plugin system is locked and removal operations are not allowed.',
        );
        this._performances.delete(fn);
        return close.call(obj);
      };
      obj.close = fn;
      this._performances.add(fn);
      return obj;
    }
    removeAllPerformance() {
      assert(
        !this._locked,
        'The plugin system is locked and removal operations are not allowed.',
      );
      this._performances.forEach((fn) => fn());
    }
    debug(options = {}) {
      assert(
        !this._locked,
        'The plugin system is locked and the debugger cannot be added.',
      );
      const close = createDebugger(this, options);
      const fn = () => {
        assert(
          !this._locked,
          'The plugin system is locked and removal operations are not allowed.',
        );
        this._debugs.delete(fn);
        close();
      };
      this._debugs.add(fn);
      return fn;
    }
    removeAllDebug() {
      assert(
        !this._locked,
        'The plugin system is locked and removal operations are not allowed.',
      );
      this._debugs.forEach((fn) => fn());
    }
    getPluginApis(pluginName) {
      return this.plugins[pluginName].apis;
    }
    listenError(fn) {
      assert(
        !this._locked,
        'The plugin system is locked and cannot listen for errors.',
      );
      const map = Object.create(null);
      for (const key in this.lifecycle) {
        map[key] = (e) => {
          fn(Object.assign(e, { name: key }));
        };
        this.lifecycle[key].listenError(map[key]);
      }
      return () => {
        assert(
          !this._locked,
          'The plugin system is locked and the listening error cannot be removed.',
        );
        for (const key in this.lifecycle) {
          this.lifecycle[key].errors.delete(map[key]);
        }
      };
    }
    useRefine(plugin) {
      return this.use(plugin, INTERNAL);
    }
    use(plugin, _flag) {
      assert(
        !this._locked,
        `The plugin system is locked and new plugins cannot be added${
          plugin.name ? `(${plugin.name})` : ''
        }.`,
      );
      if (typeof plugin === 'function') plugin = plugin(this);
      assert(isPlainObject(plugin), 'Invalid plugin configuration.');
      if (_flag === INTERNAL) {
        plugin = {
          version: plugin.version,
          name: plugin.name || uuid(),
          hooks: omit(plugin, ['name', 'version']),
        };
      }
      const { name } = plugin;
      assert(name && typeof name === 'string', 'Plugin must provide a "name".');
      assert(!this.isUsed(name), `Repeat to register plugin hooks "${name}".`);
      const register = (obj, once) => {
        if (obj) {
          for (const key in obj) {
            assert(
              hasOwn(this.lifecycle, key),
              `"${key}" hook is not defined in plugin "${name}".`,
            );
            const tag = name.startsWith(PERFORMANCE_PLUGIN_PREFIX) ? '' : name;
            if (once) {
              this.lifecycle[key].once(tag, obj[key]);
            } else {
              this.lifecycle[key].on(tag, obj[key]);
            }
          }
        }
      };
      register(plugin.hooks, false);
      register(plugin.onceHooks, true);
      this.plugins[name] = plugin;
      return plugin;
    }
    remove(pluginName) {
      assert(
        !this._locked,
        'The plugin system has been locked and the plugin cannot be cleared.',
      );
      assert(pluginName, 'Must provide a "name".');
      if (hasOwn(this.plugins, pluginName)) {
        const plugin = this.plugins[pluginName];
        const rm = (obj) => {
          if (obj) {
            for (const key in obj) {
              this.lifecycle[key].remove(obj[key]);
            }
          }
        };
        rm(plugin.hooks);
        rm(plugin.onceHooks);
        delete this.plugins[pluginName];
      }
    }
    pickLifyCycle(keys) {
      return pick(this.lifecycle, keys);
    }
    isUsed(pluginName) {
      assert(pluginName, 'Must provide a "name".');
      return hasOwn(this.plugins, pluginName);
    }
    create(callback) {
      return new PluginSystem(callback(HOOKS));
    }
    clone(usePlugin) {
      const newLifecycle = Object.create(null);
      for (const key in this.lifecycle) {
        newLifecycle[key] = this.lifecycle[key].clone();
      }
      const cloned = new this.constructor(newLifecycle);
      if (usePlugin) {
        for (const key in this.plugins) {
          cloned.use(this.plugins[key]);
        }
      }
      return cloned;
    }
  }

  function createDanmakuLifeCycle() {
    return new PluginSystem({
      hide: new SyncHook(),
      show: new SyncHook(),
      pause: new SyncHook(),
      resume: new SyncHook(),
      beforeMove: new SyncHook(),
      moved: new SyncHook(),
      reachEdge: new SyncHook(),
      createNode: new SyncHook(),
      appendNode: new SyncHook(),
      removeNode: new SyncHook(),
      beforeDestroy: new AsyncHook(),
      destroyed: new SyncHook(),
    });
  }
  function createManagerLifeCycle() {
    const { lifecycle } = createDanmakuLifeCycle();
    return new PluginSystem({
      // Danmaku hooks
      $show: lifecycle.show,
      $hide: lifecycle.hide,
      $pause: lifecycle.pause,
      $resume: lifecycle.resume,
      $beforeMove: lifecycle.beforeMove,
      $moved: lifecycle.moved,
      $reachEdge: lifecycle.reachEdge,
      $createNode: lifecycle.createNode,
      $appendNode: lifecycle.appendNode,
      $removeNode: lifecycle.removeNode,
      $beforeDestroy: lifecycle.beforeDestroy,
      $destroyed: lifecycle.destroyed,
      // Global hooks
      format: new SyncHook(),
      start: new SyncHook(),
      stop: new SyncHook(),
      show: new SyncHook(),
      hide: new SyncHook(),
      freeze: new SyncHook(),
      unfreeze: new SyncHook(),
      finished: new SyncHook(),
      clear: new SyncHook(),
      mount: new SyncHook(),
      unmount: new SyncHook(),
      init: new SyncHook(),
      limitWarning: new SyncHook(),
      push: new SyncHook(),
      render: new SyncHook(),
      updateOptions: new SyncHook(),
      willRender: new SyncWaterfallHook(),
    });
  }
  const scope = '$';
  const cache = [];
  function createDanmakuPlugin(plSys) {
    const plugin = {
      name: `__danmaku_plugin_${ids.bridge++}__`,
    };
    if (cache.length) {
      for (const [k, nk] of cache) {
        // Use named function to make it identifiable as a bridge function
        plugin[nk] = function __danmaku_bridge_fn(...args) {
          return plSys.lifecycle[k].emit(...args);
        };
      }
    } else {
      const keys = Object.keys(plSys.lifecycle);
      for (const k of keys) {
        if (k.startsWith(scope)) {
          const nk = k.replace(scope, '');
          cache.push([k, nk]);
          // Use named function to make it identifiable as a bridge function
          plugin[nk] = function __danmaku_bridge_fn(...args) {
            return plSys.lifecycle[k].emit(...args);
          };
        }
      }
    }
    return plugin;
  }
  const hasRealListeners = (hook) => {
    if (hook.isEmpty()) return false;
    for (const listener of hook.listeners) {
      if (listener.name !== '__danmaku_bridge_fn') {
        return true;
      }
    }
    return false;
  };
  function hasAnyRealListeners(
    danmakuHook,
    managerPluginSystem,
    managerHookName,
  ) {
    const hasDanmakuUserListeners = hasRealListeners(danmakuHook);
    const hasManagerListeners =
      managerPluginSystem !== undefined &&
      managerPluginSystem.lifecycle[managerHookName] !== undefined &&
      !managerPluginSystem.lifecycle[managerHookName].isEmpty();
    return hasDanmakuUserListeners || hasManagerListeners;
  }

  class FacileDanmaku {
    _options;
    data;
    loops = 0;
    isLoop = false;
    paused = false;
    moving = false;
    isEnded = false;
    isFixedDuration = false;
    rate;
    duration;
    recorder;
    nextFrame = nextFrame;
    type = 'facile';
    track = null;
    node = null;
    moveTimer = null;
    position = { x: 0, y: 0 };
    pluginSystem = createDanmakuLifeCycle();
    _internalStatuses;
    _initData;
    _hasReachedEdge = false;
    constructor(_options) {
      this._options = _options;
      this.data = _options.data;
      this.rate = _options.rate;
      this.duration = _options.duration;
      this._internalStatuses = _options.internalStatuses;
      this._initData = {
        duration: _options.duration,
        width: _options.container.width,
      };
      this.recorder = {
        pauseTime: 0,
        startTime: 0,
        prevPauseTime: 0,
      };
    }
    /**
     * @internal
     */
    _delInTrack() {
      this._options.delInTrack(this);
      if (this.track) {
        this.track._remove(this);
      }
    }
    /**
     * @internal
     */
    _summaryWidth() {
      return this._options.container.width + this.getWidth();
    }
    /**
     * @internal
     */
    _getMovePercent() {
      const { pauseTime, startTime, prevPauseTime } = this.recorder;
      const ct = this.paused ? prevPauseTime : now();
      const movePercent = (ct - startTime - pauseTime) / this.actualDuration();
      if (this._options.progress && this._options.progress > 0) {
        return movePercent + this._options.progress;
      }
      return movePercent;
    }
    /**
     * @internal
     */
    _getMoveDistance() {
      if (!this.moving) return 0;
      return this._getMovePercent() * this._summaryWidth();
    }
    /**
     * @internal
     */
    _getSpeed() {
      const cw = this._summaryWidth();
      if (cw == null) return 0;
      return cw / this.actualDuration();
    }
    /**
     * @internal
     */
    _createNode() {
      if (this.node) return;
      this.node = document.createElement('div');
      this._setStartStatus();
      this.node.__danmaku__ = this;
      this.pluginSystem.lifecycle.createNode.emit(this, this.node);
    }
    /**
     * @internal
     */
    _appendNode(container) {
      if (!this.node || this.node.parentNode === container) return;
      container.appendChild(this.node);
      this.pluginSystem.lifecycle.appendNode.emit(this, this.node);
    }
    /**
     * @internal
     */
    _removeNode(_flag) {
      if (!this.node) return;
      const parentNode = this.node.parentNode;
      if (!parentNode) return;
      parentNode.removeChild(this.node);
      if (_flag !== INTERNAL_FLAG) {
        this.pluginSystem.lifecycle.removeNode.emit(this, this.node);
      }
    }
    /**
     * @internal
     */
    _setOff() {
      return new Promise((resolve) => {
        if (!this.node) {
          this.moving = false;
          this.isEnded = true;
          resolve();
          return;
        }
        for (const key in this._internalStatuses.styles) {
          this.setStyle(key, this._internalStatuses.styles[key]);
        }
        const w = this.getWidth();
        const cw = this._options.container.width + w;
        const negative = this.direction === 'left' ? 1 : -1;
        this._internalStatuses.viewStatus === 'hide'
          ? this.hide(INTERNAL_FLAG)
          : this.show(INTERNAL_FLAG);
        const actualDuration = this.actualDuration();
        this.setStyle('transform', `translateX(${negative * cw}px)`);
        this.setStyle('transition', `transform linear ${actualDuration}ms`);
        if (this._options.progress && this._options.progress > 0) {
          const remainingTime = this._options.progress * actualDuration;
          this.setStyle('transitionDelay', `${-1 * remainingTime}ms`);
        }
        if (this.direction !== 'none') {
          this.setStyle(this.direction, `-${w}px`);
        }
        this.moving = true;
        this.recorder.startTime = now();
        this.pluginSystem.lifecycle.beforeMove.emit(this);
        if (this.direction !== 'none') {
          this._hasReachedEdge = false;
          this._monitorEdge();
        }
        whenTransitionEnds(this.node).then(() => {
          this.loops++;
          this.moving = false;
          this.isEnded = true;
          this.pluginSystem.lifecycle.moved.emit(this);
          resolve();
        });
      });
    }
    /**
     * @internal
     */
    _monitorEdge() {
      if (!this.node || !this.moving) return;
      // Check if there are any real user listeners interested in edge detection:
      // 1. Danmaku instance listeners: Could be from push({ plugin: { reachEdge() {} } })
      // 2. Manager listeners: Could be from create({ plugin: { $reachEdge() {} } })
      if (
        !hasAnyRealListeners(
          this.pluginSystem.lifecycle.reachEdge,
          this._options.managerPluginSystem,
          '$reachEdge',
        )
      ) {
        return;
      }
      const check = () => {
        if (this._hasReachedEdge || !this.moving || this.paused || !this.node) {
          return;
        }
        const containerRect =
          this._options.container.node?.getBoundingClientRect();
        if (!containerRect) return;
        const rect = this.node.getBoundingClientRect();
        // Edge detection logic:
        // 1. direction === 'left': danmaku moves from left to right, detect when right edge touches container's right edge
        //    - Initial position: danmaku starts outside container left side (left: -${width}px)
        //    - Moves right via translateX, triggers when rect.right approaches containerRect.right
        //    - Condition: rect.right >= containerRect.right - threshold
        //
        // 2. direction === 'right': danmaku moves from right to left, detect when left edge touches container's left edge
        //    - Initial position: danmaku starts outside container right side (right: -${width}px)
        //    - Moves left via translateX, triggers when rect.left approaches containerRect.left
        //    - Condition: rect.left <= containerRect.left + threshold
        //
        // threshold: Set to 1px to provide a tolerance range
        //    - Due to animation frame rate and floating point precision, danmaku position might skip exact edge values
        //    - Using threshold ensures the event triggers when danmaku is near the edge (±1px), preventing missed detections
        const threshold = 1;
        const hasReached =
          this.direction === 'left'
            ? rect.right >= containerRect.right - threshold
            : rect.left <= containerRect.left + threshold;
        if (hasReached) {
          this._hasReachedEdge = true;
          this.pluginSystem.lifecycle.reachEdge.emit(this);
          return;
        }
        requestAnimationFrame(check);
      };
      check();
    }
    /**
     * @internal
     */
    _setStartStatus() {
      this._internalStatuses.viewStatus === 'hide'
        ? this.hide(INTERNAL_FLAG)
        : this.show(INTERNAL_FLAG);
      this.setStyle('zIndex', '0');
      this.setStyle('opacity', '0');
      this.setStyle('transform', '');
      this.setStyle('transition', '');
      this.setStyle('position', 'absolute');
      this.setStyle('top', `${this.position.y}px`);
      if (this.direction !== 'none') {
        this.setStyle(this.direction, '0');
      }
    }
    /**
     * @internal
     */
    _updatePosition(p) {
      if (typeof p.x === 'number') {
        this.position.x = p.x;
      }
      if (typeof p.y === 'number') {
        this.position.y = p.y;
        this.setStyle('top', `${p.y}px`);
      }
    }
    /**
     * @internal
     */
    _updateTrack(track) {
      this.track = track;
      if (track) {
        track._add(this);
      }
    }
    /**
     * @internal
     */
    _updateDuration(duration, updateInitData = true) {
      this.isFixedDuration = true;
      this.duration = duration;
      if (updateInitData) {
        this._initData.duration = duration;
      }
    }
    /**
     * @internal
     */
    _format(oldWidth, oldHeight, newTrack) {
      if (this.isEnded) {
        this.destroy();
        return;
      }
      // Don't let the rendering of danmaku exceed the container
      if (
        this._options.container.height !== oldHeight &&
        this.getHeight() + newTrack.location.bottom >
          this._options.container.height
      ) {
        this.destroy();
        return;
      }
      // As the x-axis varies, the motion area of danmu also changes
      if (this._options.container.width !== oldWidth) {
        const { width, duration } = this._initData;
        const speed = (width + this.getWidth()) / duration;
        this._updateDuration(this._summaryWidth() / speed, false);
        if (!this.paused) {
          this.pause(INTERNAL_FLAG);
          this.resume(INTERNAL_FLAG);
        }
      }
    }
    /**
     * @internal
     */
    _reset() {
      this.loops = 0;
      this.paused = false;
      this.moving = false;
      this.position = { x: 0, y: 0 };
      this._removeNode();
      this._delInTrack();
      this._setStartStatus();
      this._updateTrack(null);
      this.setStyle('top', '');
      if (this.moveTimer) {
        this.moveTimer.clear();
        this.moveTimer = null;
      }
      this.recorder = {
        pauseTime: 0,
        startTime: 0,
        prevPauseTime: 0,
      };
      this._initData = {
        duration: this._options.duration,
        width: this._options.container.width,
      };
    }
    get direction() {
      return this._options.direction;
    }
    // When our total distance remains constant,
    // acceleration is inversely proportional to time.
    actualDuration() {
      return this.duration / this.rate;
    }
    setloop() {
      this.isLoop = true;
    }
    unloop() {
      this.isLoop = false;
    }
    getHeight() {
      return (this.node && this.node.clientHeight) || 0;
    }
    getWidth() {
      return (this.node && this.node.clientWidth) || 0;
    }
    pause(_flag) {
      if (!this.moving || this.paused) return;
      let d = this._getMoveDistance();
      if (Number.isNaN(d)) return;
      const negative = this.direction === 'left' ? 1 : -1;
      this.paused = true;
      this.recorder.prevPauseTime = now();
      this.setStyle('zIndex', '2');
      this.setStyle('transitionDuration', '0ms');
      this.setStyle('transform', `translateX(${d * negative}px)`);
      if (_flag !== INTERNAL_FLAG) {
        this.pluginSystem.lifecycle.pause.emit(this);
      }
    }
    resume(_flag) {
      if (!this.moving || !this.paused) return;
      const cw = this._summaryWidth();
      const negative = this.direction === 'left' ? 1 : -1;
      const remainingTime =
        (1 - this._getMovePercent()) * this.actualDuration();
      this.paused = false;
      this.recorder.pauseTime += now() - this.recorder.prevPauseTime;
      this.recorder.prevPauseTime = 0;
      this.setStyle('zIndex', '0');
      this.setStyle('transitionDuration', `${remainingTime}ms`);
      this.setStyle('transform', `translateX(${cw * negative}px)`);
      this.setStyle('transitionDelay', '');
      if (this.direction !== 'none' && !this._hasReachedEdge) {
        this._monitorEdge();
      }
      if (_flag !== INTERNAL_FLAG) {
        this.pluginSystem.lifecycle.resume.emit(this);
      }
    }
    hide(_flag) {
      this.setStyle('visibility', 'hidden');
      if (_flag !== INTERNAL_FLAG) {
        this.pluginSystem.lifecycle.hide.emit(this);
      }
    }
    show(_flag) {
      this.setStyle('visibility', 'visible');
      if (_flag !== INTERNAL_FLAG) {
        this.pluginSystem.lifecycle.show.emit(this);
      }
    }
    async destroy(mark) {
      await this.pluginSystem.lifecycle.beforeDestroy.emit(this, mark);
      this.moving = false;
      this._delInTrack();
      this._removeNode();
      if (this.moveTimer) {
        this.moveTimer.clear();
        this.moveTimer = null;
      }
      this.pluginSystem.lifecycle.destroyed.emit(this, mark);
      this.node = null;
    }
    setStyle(key, val) {
      if (!this.node) return;
      this.node.style[key] = val;
    }
    remove(pluginName) {
      this.pluginSystem.remove(pluginName);
    }
    use(plugin) {
      if (typeof plugin === 'function') plugin = plugin(this);
      if (!plugin.name) {
        plugin.name = `__facile_danmaku_plugin_${ids.danmu++}__`;
      }
      this.pluginSystem.useRefine(plugin);
      return plugin;
    }
  }

  class FlexibleDanmaku extends FacileDanmaku {
    _options;
    position;
    type = 'flexible';
    constructor(_options) {
      super(_options);
      this._options = _options;
      this.position = _options.position || { x: 0, y: 0 };
    }
    /**
     * @internal
     */
    _getSpeed() {
      if (this.direction === 'none') return 0;
      const { duration } = this._initData;
      const cw =
        this.direction === 'right'
          ? this.position.x + this.getWidth()
          : this.position.x;
      return cw / duration;
    }
    /**
     * @internal
     */
    _setOff() {
      return new Promise((resolve) => {
        if (!this.node) {
          this.moving = false;
          this.isEnded = true;
          resolve();
          return;
        }
        const onEnd = () => {
          this.loops++;
          this.moving = false;
          this.isEnded = true;
          if (this.moveTimer) {
            this.moveTimer.clear();
            this.moveTimer = null;
          }
          this.pluginSystem.lifecycle.moved.emit(this);
          resolve();
        };
        for (const key in this._internalStatuses.styles) {
          this.setStyle(key, this._internalStatuses.styles[key]);
        }
        this.moving = true;
        this.recorder.startTime = now();
        this.pluginSystem.lifecycle.beforeMove.emit(this);
        if (this.direction === 'none') {
          let timer = setTimeout(onEnd, this.actualDuration());
          this.moveTimer = {
            cb: onEnd,
            clear() {
              clearTimeout(timer);
              timer = null;
            },
          };
        } else {
          const ex =
            this.direction === 'left'
              ? this._options.container.width
              : -this.getWidth();
          this.setStyle(
            'transition',
            `transform linear ${this.actualDuration()}ms`,
          );
          this.setStyle(
            'transform',
            `translateX(${ex}px) translateY(${this.position.y}px)`,
          );
          this._hasReachedEdge = false;
          this._monitorEdge();
          whenTransitionEnds(this.node).then(onEnd);
        }
      });
    }
    /**
     * @internal
     */
    _setStartStatus() {
      this.setStyle('zIndex', '1');
      this.setStyle('transform', '');
      this.setStyle('transition', '');
      this.setStyle('position', 'absolute');
      this.setStyle(
        'transform',
        `translateX(${this.position.x}px) translateY(${this.position.y}px)`,
      );
      this._internalStatuses.viewStatus === 'hide'
        ? this.hide(INTERNAL_FLAG)
        : this.show(INTERNAL_FLAG);
    }
    /**
     * @internal
     */
    _updatePosition(p) {
      let needUpdateStyle = false;
      if (typeof p.x === 'number') {
        this.position.x = p.x;
        needUpdateStyle = true;
      }
      if (typeof p.y === 'number') {
        this.position.y = p.y;
        needUpdateStyle = true;
      }
      if (needUpdateStyle) {
        this.setStyle(
          'transform',
          `translateX(${this.position.x}px) translateY(${this.position.y}px)`,
        );
      }
    }
    /**
     * @internal
     */
    _getMovePercent(useInitData) {
      const { pauseTime, startTime, prevPauseTime } = this.recorder;
      const ct = this.paused ? prevPauseTime : now();
      const moveTime = ct - startTime - pauseTime;
      return (
        moveTime /
        (useInitData
          ? this._initData.duration / this.rate
          : this.actualDuration())
      );
    }
    /**
     * @internal
     */
    _getMoveDistance() {
      if (!this.moving) return 0;
      let d;
      let { x } = this.position;
      const diff = this._initData.width - this._options.container.width;
      if (this.direction === 'none') {
        d = x - diff;
      } else {
        const percent = this._getMovePercent(true);
        if (this.direction === 'left') {
          // When the container changes and the direction of movement is to the right,
          // there is no need for any changes
          d = x + (this._options.container.width - x) * percent;
        } else {
          d = x - (x + this.getWidth()) * percent - diff;
        }
      }
      return d;
    }
    /**
     * @internal
     */
    _format() {
      if (this.direction === 'left') return;
      if (this.direction === 'none') {
        this.setStyle(
          'transform',
          `translateX(${this._getMoveDistance()}px) translateY(${this.position.y}px)`,
        );
        return;
      }
      const diff = this._initData.width - this._options.container.width;
      const cw = this.position.x + this.getWidth();
      this._updateDuration((cw - diff) / this._getSpeed(), false);
      if (this.paused) {
        this.resume(INTERNAL_FLAG);
        this.pause(INTERNAL_FLAG);
      } else {
        this.pause(INTERNAL_FLAG);
        this.resume(INTERNAL_FLAG);
      }
    }
    pause(_flag) {
      if (!this.moving || this.paused) return;
      this.paused = true;
      this.recorder.prevPauseTime = now();
      if (this.direction === 'none') {
        if (this.moveTimer) this.moveTimer.clear();
      } else {
        this.setStyle('zIndex', '3');
        this.setStyle('transitionDuration', '0ms');
        this.setStyle(
          'transform',
          `translateX(${this._getMoveDistance()}px) translateY(${this.position.y}px)`,
        );
      }
      if (_flag !== INTERNAL_FLAG) {
        this.pluginSystem.lifecycle.pause.emit(this);
      }
    }
    resume(_flag) {
      if (!this.moving || !this.paused) return;
      this.paused = false;
      this.recorder.pauseTime += now() - this.recorder.prevPauseTime;
      this.recorder.prevPauseTime = 0;
      const remainingTime =
        (1 - this._getMovePercent()) * this.actualDuration();
      if (this.direction === 'none') {
        if (this.moveTimer) {
          let timer = setTimeout(
            this.moveTimer.cb || (() => {}),
            remainingTime,
          );
          this.moveTimer.clear = () => {
            clearTimeout(timer);
            timer = null;
          };
        }
      } else {
        const ex =
          this.direction === 'left'
            ? this._options.container.width
            : -this.getWidth();
        this.setStyle('zIndex', '1');
        this.setStyle('transitionDuration', `${remainingTime}ms`);
        this.setStyle(
          'transform',
          `translateX(${ex}px) translateY(${this.position.y}px)`,
        );
      }
      if (_flag !== INTERNAL_FLAG) {
        this.pluginSystem.lifecycle.resume.emit(this);
      }
    }
    remove(pluginName) {
      this.pluginSystem.remove(pluginName);
    }
    use(plugin) {
      if (typeof plugin === 'function') plugin = plugin(this);
      if (!plugin.name) {
        plugin.name = `__flexible_danmaku_plugin_${ids.danmu++}__`;
      }
      this.pluginSystem.useRefine(plugin);
      return plugin;
    }
  }

  class Engine {
    _options;
    rows = 0;
    container = new Container();
    tracks = [];
    _fx = new Queue();
    _sets = {
      view: new Set(),
      flexible: new Set(),
      stash: [],
    };
    _retryMap = new WeakMap();
    // Avoid frequent deletion of danmaku.
    // collect the danmaku that need to be deleted within 2 seconds and delete them together.
    _addDestroyQueue = batchProcess({
      ms: 3000,
      processor: (ls) => ls.forEach((dm) => dm.destroy()),
    });
    _managerPluginSystem;
    constructor(_options) {
      this._options = _options;
    }
    /**
     * @internal
     */
    _setManagerPluginSystem(managerPluginSystem) {
      this._managerPluginSystem = managerPluginSystem;
    }
    len() {
      const { stash, view, flexible } = this._sets;
      return {
        stash: stash.length,
        flexible: flexible.size,
        view: view.size + flexible.size,
        all: view.size + flexible.size + stash.length,
      };
    }
    add(data, options, isUnshift) {
      const val = data instanceof FacileDanmaku ? data : { data, options };
      this._sets.stash[isUnshift ? 'unshift' : 'push'](val);
    }
    updateOptions(newOptions) {
      this._options = Object.assign(this._options, newOptions);
      if (hasOwn(newOptions, 'gap')) {
        this._options.gap = this.container._toNumber(
          'width',
          this._options.gap,
        );
      }
      if (hasOwn(newOptions, 'overlap')) {
        let overlap = this._options.overlap;
        if (overlap < 0) overlap = 0;
        this._options.overlap = overlap;
      }
      if (hasOwn(newOptions, 'trackHeight')) {
        this.format();
      }
    }
    clear(type) {
      if (!type || type === 'facile') {
        for (let i = 0; i < this.tracks.length; i++) {
          this.tracks[i].clear();
        }
        this._sets.view.clear();
        this._sets.stash.length = 0;
      }
      if (!type || type === 'flexible') {
        for (const dm of this._sets.flexible) {
          dm.destroy();
        }
        this._sets.flexible.clear();
      }
    }
    // `flexible` and `view` are both xx,
    // so deleting some of them in the loop will not affect
    each(fn) {
      for (const dm of this._sets.flexible) {
        if (!dm.isEnded) {
          if (fn(dm) === false) return;
        }
      }
      for (const dm of this._sets.view) {
        if (!dm.isEnded) {
          if (fn(dm) === false) return;
        }
      }
    }
    // Because there are copies brought by `Array.from`,
    // deleting it in all loops will not affect
    asyncEach(fn) {
      let stop = false;
      const arr = Array.from(this._sets.flexible);
      return loopSlice(
        arr.length,
        (i) => {
          if (!arr[i].isEnded) {
            if (fn(arr[i]) === false) {
              stop = true;
              return false;
            }
          }
        },
        17,
      ).then(() => {
        if (stop) return;
        const arr = Array.from(this._sets.view);
        return loopSlice(
          arr.length,
          (i) => {
            if (!arr[i].isEnded) {
              return fn(arr[i]);
            }
          },
          17,
        );
      });
    }
    format() {
      const { width, height } = this.container;
      this.container._format();
      const { gap, trackHeight } = this._options;
      this._options.gap = this.container._toNumber('width', gap);
      const h = this.container._toNumber('height', trackHeight);
      if (h <= 0) {
        for (let i = 0; i < this.tracks.length; i++) {
          this.tracks[i].clear();
        }
        return;
      }
      const rows = (this.rows = +(this.container.height / h).toFixed(0));
      for (let i = 0; i < rows; i++) {
        const track = this.tracks[i];
        const top = h * i;
        const bottom = h * (i + 1) - 1;
        const middle = (bottom - top) / 2 + top;
        const location = { top, middle, bottom };
        if (bottom > this.container.height) {
          this.rows--;
          if (track) {
            this.tracks[i].clear();
            this.tracks.splice(i, 1);
          }
        } else if (track) {
          // If the reused track is larger than the container height,
          // the overflow needs to be deleted.
          if (track.location.middle > this.container.height) {
            this.tracks[i].clear();
          } else {
            track.each((dm) => {
              dm._format(width, height, track);
            });
          }
          track._updateLocation(location);
        } else {
          const track = new Track({
            index: i,
            list: [],
            location,
            container: this.container,
          });
          this.tracks.push(track);
        }
      }
      // Delete the extra tracks and the danmaku inside
      if (this.tracks.length > this.rows) {
        for (let i = this.rows; i < this.tracks.length; i++) {
          this.tracks[i].clear();
        }
        this.tracks.splice(this.rows, this.tracks.length - this.rows);
      }
      // If `flexible` danmaku is also outside the view, it also needs to be deleted
      for (const dm of this._sets.flexible) {
        if (dm.position.y > this.container.height) {
          dm.destroy();
        } else if (width !== this.container.width) {
          dm._format();
        }
      }
    }
    renderFlexibleDanmaku(data, options, { hooks, statuses, danmakuPlugin }) {
      assert(this.container, 'Container not formatted');
      hooks.render.call(null, 'flexible');
      const dm = this._create('flexible', data, options, statuses);
      if (dm.position.x > this.container.width) return false;
      if (dm.position.y > this.container.height) return false;
      if (options.plugin) dm.use(options.plugin);
      dm.use(danmakuPlugin);
      const { prevent } = hooks.willRender.call(null, {
        type: 'flexible',
        danmaku: dm,
        prevent: false,
        trackIndex: null,
      });
      if (this._options.rate > 0 && prevent !== true) {
        const setup = () => {
          dm._createNode();
          this._sets.flexible.add(dm);
          this._setAction(dm, statuses).then((isFreeze) => {
            if (isFreeze) {
              // console.error(
              //   'Currently in a freeze state, unable to render "FlexibleDanmaku"',
              // );
              return;
            }
            if (dm.isLoop) {
              dm._setStartStatus();
              setup();
              return;
            }
            dm.destroy();
            if (this.len().all === 0) {
              hooks.finished.call(null);
            }
          });
        };
        setup();
        return true;
      }
      return false;
    }
    renderFacileDanmaku({ hooks, statuses, danmakuPlugin }) {
      const { mode, limits } = this._options;
      const launch = () => {
        const num = this.len();
        let l = num.stash;
        if (typeof limits.view === 'number') {
          const max = limits.view - num.view;
          if (l > max) l = max;
        }
        if (mode === 'strict' && l > this.rows) {
          l = this.rows;
        }
        if (l <= 0) return;
        hooks.render.call(null, 'facile');
        return loopSlice(l, () =>
          this._consumeFacileDanmaku(statuses, danmakuPlugin, hooks),
        );
      };
      if (mode === 'strict') {
        this._fx.add((next) => {
          const p = launch();
          p ? p.then(next) : next();
        });
      } else {
        launch();
      }
    }
    _consumeFacileDanmaku(statuses, danmakuPlugin, hooks) {
      let dm;
      const layer = this._sets.stash.shift();
      if (!layer) return;
      const track = this._getTrack();
      if (!track) {
        this._sets.stash.unshift(layer);
        // If there is nothing to render, return `false` to stop the loop.
        return false;
      }
      if (layer instanceof FacileDanmaku) {
        dm = layer;
      } else {
        dm = this._create('facile', layer.data, layer.options, statuses);
        if (layer.options.plugin) {
          dm.use(layer.options.plugin);
        }
        dm.use(danmakuPlugin);
      }
      const { prevent } = hooks.willRender.call(null, {
        type: 'facile',
        danmaku: dm,
        prevent: false,
        trackIndex: track.index,
      });
      // When the rate is less than or equal to 0,
      // the danmaku will never move, but it will be rendered,
      // so just don't render it here.
      if (this._options.rate > 0 && prevent !== true) {
        // First createNode, users may add styles
        dm._createNode();
        dm._appendNode(this.container.node);
        dm._updateTrack(track);
        const setup = () => {
          this._sets.view.add(dm);
          this._setAction(dm, statuses).then((isStash) => {
            if (isStash) {
              dm._reset();
              this._sets.view.delete(dm);
              const retries = (this._retryMap.get(dm) || 0) + 1;
              this._retryMap.set(dm, retries);
              if (retries > 1 && this.len().stash > 100) {
                // discard the danmaku when we have a lot of stash danmaku
                this._retryMap.delete(dm);
                this._addDestroyQueue(dm);
              } else {
                this._sets.stash.unshift(dm);
              }
              return;
            }
            if (dm.isLoop) {
              dm._setStartStatus();
              setup();
              return;
            }
            this._addDestroyQueue(dm);
            if (this.len().all === 0) {
              hooks.finished.call(null);
            }
          });
        };
        // Waiting for the style to take effect,
        // we need to get the danmaku screen height.
        let i = 0;
        const triggerSetup = () => {
          nextFrame(() => {
            const height = dm.getHeight();
            if (height === 0 && ++i < 20) {
              triggerSetup();
            } else {
              const y = track.location.middle - height / 2;
              if (y + height > this.container.height) return;
              dm._updatePosition({ y });
              setup();
            }
          });
        };
        triggerSetup();
      }
    }
    _setAction(cur, internalStatuses) {
      return new Promise((resolve) => {
        nextFrame(() => {
          if (internalStatuses.freeze === true) {
            resolve(true);
            return;
          }
          const { mode, durationRange } = this._options;
          if (cur.type === 'facile') {
            const speed = this._calculateSpeed(cur._options.speed);
            if (speed) {
              cur._updateDuration(cur._summaryWidth() / speed, true);
            } else if (mode === 'strict' || mode === 'adaptive') {
              assert(cur.track, 'Track not found');
              const prev = cur.track._last(1);
              if (prev && cur.loops === 0) {
                const fixTime = this._collisionPrediction(prev, cur);
                if (fixTime !== null) {
                  if (isInBounds(durationRange, fixTime)) {
                    cur._updateDuration(fixTime, true);
                  } else if (mode === 'strict') {
                    resolve(true);
                    return;
                  }
                }
              }
            }
          } else if (cur.type === 'flexible') {
            cur.use({
              appendNode: () => {
                const speed = this._calculateSpeed(cur._options.speed);
                if (speed) {
                  cur._updateDuration(
                    (cur.position.x + cur.getWidth()) / speed,
                    true,
                  );
                }
              },
            });
          }
          cur._appendNode(this.container.node);
          nextFrame(() => {
            if (internalStatuses.freeze === true) {
              cur._removeNode(INTERNAL_FLAG);
              resolve(true);
            } else {
              cur._setOff().then(() => resolve(false));
            }
          });
        });
      });
    }
    _create(type, data, options, internalStatuses) {
      assert(this.container, 'Container not formatted');
      const config = {
        data,
        internalStatuses,
        rate: options.rate,
        speed: options.speed,
        container: this.container,
        duration: options.duration,
        direction: options.direction,
        progress: options.progress,
        managerPluginSystem: this._managerPluginSystem,
        delInTrack: (b) => {
          remove(this._sets.view, b);
          type === 'facile'
            ? remove(this._sets.stash, b)
            : remove(this._sets.flexible, b);
        },
      };
      if (type === 'facile') {
        // Create FacileDanmaku
        return new FacileDanmaku(config);
      } else {
        // Create FlexibleDanmaku
        const dm = new FlexibleDanmaku(config);
        const { position } = options;
        // If it is a function, the position will be updated after the node is created,
        // so that the function can get accurate danmaku data.
        if (typeof position === 'function') {
          dm.use({
            appendNode: () => {
              let { x, y } = position(dm, this.container);
              x = this.container._toNumber('width', x);
              y = this.container._toNumber('height', y);
              dm._updatePosition({ x, y });
            },
          });
        } else {
          const x = this.container._toNumber('width', position.x);
          const y = this.container._toNumber('height', position.y);
          dm._updatePosition({ x, y });
        }
        return dm;
      }
    }
    _calculateSpeed(s) {
      if (s && typeof s === 'string') {
        s = this.container._toNumber('width', s);
        assert(
          isNumber(s) && s > 0,
          `The speed must > 0, but the current value is "${s}"`,
        );
      }
      return s;
    }
    _getTrackRandom() {
      const i = getTrackRandomIdx(this.rows);
      const track = this.tracks[i];
      return track ?? null;
    }
    _getTrack(founds = new Set()) {
      if (this.rows === 0) return null;
      const { gap, mode, distribution } = this._options;
      if (founds.size === this.tracks.length) {
        return mode === 'adaptive' ? (this._getTrackRandom() ?? null) : null;
      }
      const i = getTrackIdx(founds, this.rows, distribution);
      const track = this.tracks[i];
      if (!track.isLock) {
        if (mode === 'none') {
          return track;
        }
        const last = track._last(0);
        if (!last) {
          return track;
        }
        const lastWidth = last.getWidth();
        if (lastWidth > 0 && last._getMoveDistance() >= gap + lastWidth) {
          return track;
        }
      }
      founds.add(i);
      return this._getTrack(founds);
    }
    _collisionPrediction(prv, cur) {
      const cs = cur._getSpeed();
      const ps = prv._getSpeed();
      const acceleration = cs - ps;
      if (acceleration <= 0) return null;
      const overlap = this._options.overlap;
      const cw = cur.getWidth() * (1 - overlap);
      const pw = prv.getWidth();
      const { gap } = this._options;
      const distance = prv._getMoveDistance() - cw - pw - gap;
      const collisionTime = distance / acceleration;
      if (collisionTime >= cur.duration) return null;
      assert(this.container, 'Container not formatted');
      const remainingTime = (1 - prv._getMovePercent()) * prv.duration;
      const currentFixTime =
        ((cw + gap) * remainingTime) / this.container.width;
      return remainingTime + currentFixTime;
    }
  }

  class Manager {
    options;
    version = '0.20.0';
    nextFrame = nextFrame;
    statuses = Object.create(null);
    pluginSystem = createManagerLifeCycle();
    _engine;
    _renderTimer = null;
    _internalStatuses = Object.create(null);
    constructor(options) {
      this.options = options;
      this._engine = new Engine(options);
      this._engine._setManagerPluginSystem(this.pluginSystem);
      this._internalStatuses.freeze = false;
      this._internalStatuses.viewStatus = 'show';
      this._internalStatuses.styles = Object.create(null);
      this._internalStatuses.styles.opacity = '';
      this.pluginSystem.lifecycle.init.emit(this);
      this.options.overlap ??= 0;
    }
    /**
     * @internal
     */
    _mergeOptions(pushOptions) {
      const options = pushOptions ? pushOptions : Object.create(null);
      if (!('rate' in options)) {
        options.rate = this.options.rate;
      }
      if (!('speed' in options)) {
        options.speed = this.options.speed;
      }
      if (!('direction' in options)) {
        options.direction = this.options.direction;
      }
      if (!('duration' in options)) {
        const duration = random(...this.options.durationRange);
        assert(duration > 0, `Invalid duration "${duration}"`);
        options.duration = duration;
      }
      return options;
    }
    /**
     * @internal
     */
    _setViewStatus(status, filter) {
      return new Promise((resolve) => {
        if (this._internalStatuses.viewStatus === status) {
          resolve();
          return;
        }
        this._internalStatuses.viewStatus = status;
        this.pluginSystem.lifecycle[status].emit();
        this._engine
          .asyncEach((b) => {
            if (this._internalStatuses.viewStatus === status) {
              if (!filter || filter(b) !== true) {
                b[status]();
              }
            } else {
              return false;
            }
          })
          .then(resolve);
      });
    }
    get container() {
      return this._engine.container;
    }
    get trackCount() {
      return this._engine.tracks.length;
    }
    len() {
      return this._engine.len();
    }
    isShow() {
      return this._internalStatuses.viewStatus === 'show';
    }
    isFreeze() {
      return this._internalStatuses.freeze === true;
    }
    isPlaying() {
      return this._renderTimer !== null;
    }
    isDanmaku(dm) {
      return dm instanceof FacileDanmaku || dm instanceof FlexibleDanmaku;
    }
    each(fn) {
      this._engine.each(fn);
    }
    asyncEach(fn) {
      return this._engine.asyncEach(fn);
    }
    getTrack(i) {
      i = i >= 0 ? i : this.trackCount + i;
      return this._engine.tracks[i];
    }
    freeze({ preventEvents = [] } = {}) {
      let stopFlag;
      let pauseFlag;
      if (preventEvents.includes('stop')) {
        stopFlag = INTERNAL_FLAG;
      }
      if (preventEvents.includes('pause')) {
        pauseFlag = INTERNAL_FLAG;
      }
      this.stopPlaying(stopFlag);
      this.each((dm) => dm.pause(pauseFlag));
      this._internalStatuses.freeze = true;
      this.pluginSystem.lifecycle.freeze.emit();
    }
    unfreeze({ preventEvents = [] } = {}) {
      let startFlag;
      let resumeFlag;
      if (preventEvents.includes('start')) {
        startFlag = INTERNAL_FLAG;
      }
      if (preventEvents.includes('resume')) {
        resumeFlag = INTERNAL_FLAG;
      }
      this.each((dm) => dm.resume(resumeFlag));
      this.startPlaying(startFlag);
      this._internalStatuses.freeze = false;
      this.pluginSystem.lifecycle.unfreeze.emit();
    }
    format() {
      this._engine.format();
      this.pluginSystem.lifecycle.format.emit();
    }
    mount(parentNode, { clear = true } = {}) {
      if (parentNode) {
        if (typeof parentNode === 'string') {
          const res = document.querySelector(parentNode);
          assert(res, `Invalid selector "${parentNode}"`);
          parentNode = res;
        }
        if (this.isPlaying()) {
          clear && this.clear(null, INTERNAL_FLAG);
        }
        this._engine.container._mount(parentNode);
        this.format();
        this.pluginSystem.lifecycle.mount.emit(parentNode);
      }
    }
    unmount() {
      const { parentNode } = this.container;
      this.container._unmount();
      this.pluginSystem.lifecycle.unmount.emit(parentNode);
    }
    clear(type, _flag) {
      this._engine.clear(type);
      if (_flag !== INTERNAL_FLAG) {
        this.pluginSystem.lifecycle.clear.emit(type);
      }
    }
    updateOptions(newOptions, key) {
      this._engine.updateOptions(newOptions);
      newOptions.overlap ??= this.options.overlap;
      this.options = Object.assign(this.options, newOptions);
      if (hasOwn(newOptions, 'interval')) {
        this.stopPlaying(INTERNAL_FLAG);
        this.startPlaying(INTERNAL_FLAG);
      }
      this.pluginSystem.lifecycle.updateOptions.emit(newOptions, key);
    }
    startPlaying(_flag) {
      if (this.isPlaying()) return;
      if (_flag !== INTERNAL_FLAG) {
        this.pluginSystem.lifecycle.start.emit();
      }
      const cycle = () => {
        this._renderTimer = setTimeout(cycle, this.options.interval);
        this.render();
      };
      cycle();
    }
    stopPlaying(_flag) {
      if (!this.isPlaying()) return;
      if (this._renderTimer) {
        clearTimeout(this._renderTimer);
      }
      this._renderTimer = null;
      if (_flag !== INTERNAL_FLAG) {
        this.pluginSystem.lifecycle.stop.emit();
      }
    }
    show(filter) {
      return this._setViewStatus('show', filter);
    }
    hide(filter) {
      return this._setViewStatus('hide', filter);
    }
    canPush(type) {
      let res = true;
      const isFacile = type === 'facile';
      const { limits } = this.options;
      const { stash, view } = this._engine.len();
      if (isFacile) {
        res = stash < limits.stash;
      } else if (typeof limits.view === 'number') {
        res = view < limits.view;
      }
      return res;
    }
    unshift(data, options) {
      return this.push(data, options, INTERNAL_FLAG);
    }
    push(data, options, _unshift) {
      if (!this.canPush('facile')) {
        const { stash } = this.options.limits;
        const hook = this.pluginSystem.lifecycle.limitWarning;
        !hook.isEmpty()
          ? hook.emit('facile', stash)
          : console.warn(
              `The number of danmu in temporary storage exceeds the limit (${stash})`,
            );
        return false;
      }
      const isUnshift = _unshift === INTERNAL_FLAG;
      if (!this.isDanmaku(data)) {
        options = this._mergeOptions(options);
      }
      this._engine.add(data, options, isUnshift);
      this.pluginSystem.lifecycle.push.emit(data, 'facile', isUnshift);
      return true;
    }
    pushFlexibleDanmaku(data, options) {
      if (!this.isPlaying()) return false;
      if (typeof options.duration === 'number' && options.duration < 0) {
        return false;
      }
      if (!this.canPush('flexible')) {
        const { view } = this.options.limits;
        const hook = this.pluginSystem.lifecycle.limitWarning;
        !hook.isEmpty()
          ? hook.emit('flexible', view || 0)
          : console.warn(
              `The number of danmu in view exceeds the limit (${view})`,
            );
        return false;
      }
      const res = this._engine.renderFlexibleDanmaku(
        data,
        this._mergeOptions(options),
        {
          statuses: this._internalStatuses,
          danmakuPlugin: createDanmakuPlugin(this.pluginSystem),
          hooks: {
            finished: () => this.pluginSystem.lifecycle.finished.emit(),
            render: (val) => this.pluginSystem.lifecycle.render.emit(val),
            willRender: (val) =>
              this.pluginSystem.lifecycle.willRender.emit(val),
          },
        },
      );
      if (res) {
        this.pluginSystem.lifecycle.push.emit(data, 'flexible', false);
        return true;
      }
      return false;
    }
    updateOccludedUrl(url, el) {
      let set;
      if (el) {
        if (typeof el === 'string') {
          const res = document.querySelector(el);
          assert(res, `Invalid selector "${el}"`);
          el = res;
        }
        set = (key, val) => (el.style[key] = val);
      } else {
        set = (key, val) => this.container.setStyle(key, val);
      }
      if (url) {
        assert(typeof url === 'string', `Invalid url "${url}"`);
        set('maskImage', `url("${url}")`);
        set('webkitMaskImage', `url("${url}")`);
        set('maskSize', 'cover');
        set('webkitMaskSize', 'cover');
      } else {
        set('maskImage', 'none');
        set('webkitMaskImage', 'none');
      }
    }
    render() {
      this._engine.renderFacileDanmaku({
        statuses: this._internalStatuses,
        danmakuPlugin: createDanmakuPlugin(this.pluginSystem),
        hooks: {
          finished: () => this.pluginSystem.lifecycle.finished.emit(),
          render: (val) => this.pluginSystem.lifecycle.render.emit(val),
          willRender: (val) => this.pluginSystem.lifecycle.willRender.emit(val),
        },
      });
    }
    remove(pluginName) {
      this.pluginSystem.remove(pluginName);
    }
    use(plugin) {
      if (typeof plugin === 'function') plugin = plugin(this);
      if (!plugin.name) {
        plugin.name = `__runtime_plugin_${ids.runtime++}__`;
      }
      this.pluginSystem.useRefine(plugin);
      return plugin;
    }
    setStyle(key, val) {
      const { styles } = this._internalStatuses;
      if (styles[key] !== val) {
        styles[key] = val;
        this._engine.asyncEach((dm) => {
          if (dm.moving) {
            dm.setStyle(key, val);
          }
        });
      }
    }
    setOpacity(opacity) {
      if (typeof opacity === 'string') {
        opacity = Number(opacity);
      }
      if (opacity < 0) {
        opacity = 0;
      } else if (opacity > 1) {
        opacity = 1;
      }
      this.setStyle('opacity', String(opacity));
    }
    setArea(size) {
      if (!isEmptyObject(size)) {
        this._engine.container._updateSize(size);
        this.format();
      }
    }
    setGap(gap) {
      this.updateOptions({ gap }, 'gap');
    }
    setMode(mode) {
      this.updateOptions({ mode }, 'mode');
    }
    setSpeed(speed) {
      this.updateOptions({ speed }, 'speed');
    }
    setRate(rate) {
      if (rate !== this.options.rate) {
        this.updateOptions({ rate }, 'rate');
      }
    }
    setInterval(interval) {
      this.updateOptions({ interval }, 'interval');
    }
    setTrackHeight(trackHeight) {
      this.updateOptions({ trackHeight }, 'trackHeight');
    }
    setDurationRange(durationRange) {
      this.updateOptions({ durationRange }, 'durationRange');
    }
    setDirection(direction) {
      this.updateOptions({ direction }, 'direction');
    }
    setOverlap(overlap) {
      if (overlap < 0) overlap = 0;
      this.updateOptions({ overlap }, 'overlap');
    }
    setLimits({ view, stash }) {
      let needUpdate = false;
      const limits = Object.assign({}, this.options.limits);
      if (typeof view === 'number') {
        needUpdate = true;
        limits.view = view;
      }
      if (typeof stash === 'number') {
        needUpdate = true;
        limits.stash = stash;
      }
      if (needUpdate) {
        this.updateOptions({ limits }, 'limits');
      }
    }
  }

  const formatOptions = (options) => {
    const newOptions = Object.assign(
      {
        gap: 0,
        rate: 1,
        limits: {},
        interval: 500,
        mode: 'strict',
        direction: 'right',
        trackHeight: '20%',
        durationRange: [4000, 6000],
      },
      options,
    );
    assert(newOptions.gap >= 0, 'Gap must be greater than or equal to 0');
    if (typeof newOptions.limits.stash !== 'number') {
      newOptions.limits.stash = Infinity;
    }
    return newOptions;
  };
  function create(options) {
    const opts = formatOptions(options);
    const manager = new Manager(opts);
    if (opts.plugin) {
      const plugins = Array.isArray(opts.plugin) ? opts.plugin : [opts.plugin];
      for (const plugin of plugins) {
        manager.use(plugin);
      }
      manager.pluginSystem.lifecycle.init.emit(manager);
    }
    return manager;
  }

  exports.create = create;
});
