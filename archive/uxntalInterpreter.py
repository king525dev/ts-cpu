"""
( ( ## UXNTAL INTERPRETER ## ) )
"""

"""
# IDENTIFYING INFORMATION #

    Name:          AJIBADE Oreoluwa
    Student_ID:    3174226A
    Description:   A Python program that interprets Uxntal code and runs it. A Uxntal Interpreter.
"""

"""
( # CODE # )
"""
from enum import Enum
import  sys, getopt


WW = False
V = False # Verbose, explain a bit what happens
VV = False # More verbose, explain in more detail what happens
DBG = False # Debug info

TRACE = 0

# Read program file and parse command-line flags (verbose/debug modes)
try: 
    path = sys.argv[1];
    
    with open(path) as f:
        programText = f.read();
    
    opts, args = getopt.getopt(
        sys.argv[2:],
        "v",
        ["dbg", "ww", "vv"]
    )
except  getopt.GetoptError  as  err:
    print(str(err))
except Exception as e:
    print(f"Unexpected error: {e}")
    

# Read program file and parse command-line flags (verbose/debug modes)
for  opt,  val  in  opts:
    match opt:
        case "-v":
            V = True;
        case "--dbg":
            DBG = True;
        case "--ww":
            WW = True;
        case "--vv":
            VV = True;

# Token types used by the interpreter (literals, instructions, labels, etc.)
class T(Enum):
    MAIN = 0 # Main program
    LIT = 1 # Literal
    INSTR = 2 # Instruction
    LABEL = 3 # Label
    ABSREF = 4 # Address reference (rel=1, abs=2)
    RELREF = 5 # Address reference (rel=1, abs=2)
    RAW = 6 # Raw values (i.e. not literal)
    ABSPAD = 7 # Address (absolute padding)
    RELPAD = 8 # Relative padding)
    EMPTY = 9 # Memory is filled with this by default

# Represents the Uxn virtual machine (memory, stacks, program counter, symbols)
class Uxn:
    memory = [(T.EMPTY,)] * 0x10000 # 64KB memory storing tokens
    stacks = ([],[]) # Working stack (WS) and return stack (RS); stored as a tuple of (value, size)
    # where size is the size in bytes (1=byte, 2=short)
    progCounter = 0 # Current instruction pointer
    symbolTable={}
    # First unused address, only used for verbose
    free = 0

# Converts a token string into a structured token tuple
def parseToken(tokenStr):
    global TRACE
    TRACE=TRACE+1  
    
    # Literal values (#01, #0001)
    if tokenStr[0] == '#':
        valStr=tokenStr[1:]
        val = int(valStr,16)
        if len(valStr)==2:
            return (T.LIT,val,1)
        else:
            return (T.LIT,val,2)
    
    # String literals ("abc")
    if tokenStr[0] == '"':
        chars =list(tokenStr[1:])
        return list(map(lambda c: (T.LIT, ord(c),1),chars))
    
    # Absolute label reference (;label)
    elif tokenStr[0] == ';':
        val = tokenStr[1:]
        return (T.ABSREF,val,2)
    
    # Relative label reference (, &label)
    elif tokenStr[0] == ',':
        if tokenStr[1] == '&':
            val = tokenStr[2:]
            return (T.RELREF,val,1)
        
    # Label definitions (@label, &label)
    elif tokenStr[0] == '@':
        val = tokenStr[1:]
        return (T.LABEL,val)
    elif tokenStr[0] == '&':
        val = tokenStr[1:]
        return (T.LABEL, val)
    
    # Program start marker (|0100)
    elif tokenStr == '|0100':
        return (T.MAIN,)
    
    # Memory padding (absolute/relative)
    elif tokenStr[0] == '|':
        val = int(tokenStr[1:], 16)
        return (T.ABSPAD, val)
    elif tokenStr[0] == '$':
        val = int(tokenStr[1:], 16)
        return (T.RELPAD, val)
    
    # Instructions (ADD, LDA2, etc.)
    elif tokenStr[0].isupper():
        if len(tokenStr) == 3:
            return (T.INSTR,tokenStr[0:len(tokenStr)],1,0,0)
        elif len(tokenStr) == 4:
            if tokenStr[-1] == '2':
                return (T.INSTR,tokenStr[0:len(tokenStr)-1],2,0,0)
            elif tokenStr[-1] == 'r':
                return (T.INSTR,tokenStr[0:len(tokenStr)-1],1,1,0)
            elif tokenStr[-1] == 'k':
                return (T.INSTR,tokenStr[0:len(tokenStr)-1],1,0,1)
        elif len(tokenStr) == 5:
            # Order must be size:stack:keep
            if tokenStr[len(tokenStr)-2:len(tokenStr)] == '2r':
                return (T.INSTR,tokenStr[0:len(tokenStr)-2],2,1,0)
            elif tokenStr[len(tokenStr)-2:len(tokenStr)] == '2k':
                return (T.INSTR,tokenStr[0:len(tokenStr)-2],2,0,1)
            elif tokenStr[len(tokenStr)-2:len(tokenStr)] == 'rk':
                return (T.INSTR,tokenStr[0:len(tokenStr)-2],1,1,1)
        elif len(tokenStr) == 6:
            return (T.INSTR,tokenStr[0:len(tokenStr)-1],2,1,1)
    else:
        # Raw hex values
        return (T.RAW,int(tokenStr,16))


# Actions related to the various Uxn instructions

# Memory operations
# STA
def store(args,sz,uxn):
    uxn.memory[args[0]] = (T.RAW,args[1],0)

# LDA
def load(args,sz, uxn):
    
    if DBG:
        addr = args[0]
        token = uxn.memory[addr]
        print("DEBUG LOAD:", addr, token)
        
        print("DEBUG LOAD:", uxn.memory[args[0]])
    return uxn.memory[args[0]][1]


# Control operations
# JSR
def call(args,sz,uxn):
    uxn.stacks[1].append( (uxn.progCounter+1,2) )
    uxn.progCounter = args[0]-1
# JMP
def jump(args,sz,uxn):
    uxn.progCounter = args[0]-1
# JCN
def condJump(args,sz,uxn):
    if args[1] == 1 :
        uxn.progCounter = args[0]-1

# Stack manipulation operations
# STH
def stash(rs,sz,uxn):
    uxn.stacks[1-rs].append(uxn.stacks[rs].pop())

# POP
def pop(rs, sz, uxn):
    uxn.stacks[rs].pop()

# SWP
def swap(rs,sz,uxn):
        b = uxn.stacks[rs].pop()
        a = uxn.stacks[rs].pop()
        uxn.stacks[rs].append(b)
        uxn.stacks[rs].append(a)
        
# NIP
def nip(rs,sz,uxn): 
        b = uxn.stacks[rs].pop()
        if b[1]==sz:
            a = uxn.stacks[rs].pop()
            if a[1]==sz:
                uxn.stacks[rs].append(b)
            else:
                print("Error: Args on stack for NIP",sz,"are of wrong size")
                print("Run with `--dbg` flag for more information")
                exit()
        elif b[1]==2 and sz==1:
            bb = b[0]&0xFF
            uxn.stacks[rs].append( (bb,1) )
        elif b[1]==1 and sz==2:
            print("Error: Args on stack for NIP",sz,"are of wrong size")
            print("Run with `--dbg` flag for more information")
            exit()

# ROT
def rot(rs, sz, uxn):
    item = uxn.stacks[rs].pop(0)
    uxn.stacks[rs].append(item)

# DUP
def dup(rs,sz,uxn):
        a = uxn.stacks[rs][-1]
        uxn.stacks[rs].append(a)

# OVR
def over(rs,sz,uxn): 
        a = uxn.stacks[rs][-2]
        uxn.stacks[rs].append(a)

# ALU operations
# ADD
def add(args,sz,uxn):
    return args[0] + args[1]

# SUB
def sub(args, sz, uxn):
    return abs(args[0] - args[1])

# MUL
def mul(args, sz, uxn):
    return args[0] * args[1]

# DIV
def div(args, sz, uxn):
    if args[1] == 0:
        print("Error: Division by zero")
        print("Run with `--dbg` flag for more information")
        exit()
    return args[0] // args[1]

# INC
def inc(args, sz, uxn):
    return args[0] + 1

# EQU
def equ(args, sz, uxn):
    if args[0] == args[1]:
        return 1;
    else:
        return 0;
    
# NEQ
def neq(args, sz, uxn):
    if args[0] != args[1]:
        return 1;
    else:
        return 0;
    
# LTH
def lth(args, sz, uxn):
    if args[0] > args[1]:
        return 1;
    else:
        return 0;
    
# GTH
def gth(args, sz, uxn):
    if args[0] < args[1]:
        return 1;
    else:
        return 0;

# Maps instruction names to (function, number of args, returns result)
callInstr = {
    'ADD': (add, 2, True),
    'SUB': (sub, 2, True),
    'MUL': (mul, 2, True),
    'DIV': (div, 2, True),
    'INC': (inc, 1, True),

    'EQU': (equ, 2, True),
    'NEQ': (neq, 2, True),
    'LTH': (lth, 2, True),
    'GTH': (gth, 2, True),

    'DEO': (lambda args, sz, uxn: print(chr(args[1]), end=''), 2, False),

    'JSR': (call, 1, False),
    'JMP': (jump, 1, False),
    'JCN': (condJump, 2, False),

    'LDA': (load, 1, True),
    'STA': (store, 2, False),

    'STH': (stash, 0, False),
    'DUP': (dup, 0, False),
    'SWP': (swap, 0, False),
    'OVR': (over, 0, False),
    'NIP': (nip, 0, False),

    'POP': (pop, 0, False),
    'ROT': (rot, 0, False)
}

# Executes a single instruction token using the appropriate operation
def executeInstr(token,uxn):
    global TRACE
    TRACE=TRACE+1

    _t,instr,sz,rs,keep = token
    
    # Handle program termination (BRK)
    if instr == 'BRK':
        if V:
            print("\n",'*** DONE *** ')
        else:
            print('')
        if VV:
            print('PC:',uxn.progCounter,' (WS,RS):',uxn.stacks)
        exit('TRACE: '+str(TRACE))
        
    # Fetch instruction metadata 
    action,nArgs,hasRes = callInstr[instr]
    
    # Check for stack underflow
    if len(uxn.stacks[rs]) < nArgs:
        print("Stack Underflow at PC:", uxn.progCounter)
        print("Run with `--dbg` flag for more information")
        exit()
        
    # Handle stack-only operations (no arguments)
    if nArgs==0: # means it is a stack manipulation
        action(rs,sz,uxn)
    else:
        # Pop arguments from stack (respecting size and keep mode)
        args=[]
        for i in reversed(range(0,nArgs)):
            if keep == 0:
                arg = uxn.stacks[rs].pop()
                if arg[1]==2 and sz==1 and (instr != 'LDA' and instr!= 'STA'):
                    if WW:
                        print("Warning: Args on stack for",instr,sz,"are of wrong size (short for byte)")
                        print("Run with `--dbg` flag for more information")
                    uxn.stacks[rs].append( (arg[0]>>8,1) )
                    args.append((arg[0]&0xFF))
                else: # either 2 2 or 1 1 or 1 2
                    args.append(arg[0]) # works for 1 1 or 2 2
                    if arg[1]==1 and sz==2:
                        arg1 = arg
                        arg2 = uxn.stacks[rs].pop()
                        if arg2[1]==1 and sz==2:
                            arg = (arg2[0]<<8) + arg1[0]
                            args.append(arg) # a b 
                        else:
                            print("Error: Args on stack are of wrong size (short after byte)")
                            print("Run with `--dbg` flag for more information")
                            exit()
            else:
                arg = uxn.stacks[rs][i]
                if arg[1]!= sz and (instr != 'LDA' and instr!= 'STA'):
                    print("Error: Args on stack are of wrong size (keep)")
                    print("Run with `--dbg` flag for more information")
                    exit()
                else:
                    args.append(arg[0])
        
        # Execute instruction and push result if needed
        if VV:
            print('EXEC INSTR:',instr, 'with args', args)
        if hasRes:
            res = action(args,sz,uxn)
            if instr == 'EQU' or instr == 'NEQ' or instr == 'LTH' or instr == 'GTH':
                uxn.stacks[rs].append( (res,1) )
            else:
                uxn.stacks[rs].append( (res,sz) )
        else:
            action(args,sz,uxn)

# Removes comments enclosed in parentheses from program text
def stripComments(programText):
    result = "";
    in_comment = False;

    for char in programText:
        if char == '(':
            in_comment = True;
        elif char == ')':
            in_comment = False;
        elif not in_comment:
            result += char;

    return result;

# Splits program text into individual token strings
def tokeniseProgramText(programText):
    return programText.split();

# Flattens parsed tokens (handles lists from string literals)
def populateTokens(tokensWithStrings):
    global TRACE
    TRACE=TRACE+1 
    
    tokens=[]
    
    for token in tokensWithStrings:
        if isinstance(token, list):
            tokens.extend(token)
        else:
            tokens.append(token)
    
    return tokens

# First pass: load tokens into memory and record label addresses
def populateMemoryAndBuildSymbolTable(tokens,uxn):
    global TRACE
    TRACE=TRACE+1

    pc = 0
    for token in tokens:
        if token == (T.MAIN,):
            pc = 0x0100
        elif token[0] == T.ABSPAD:
            pc = token[1]
        elif token[0] == T.RELPAD: # relative only
            pc = pc + token[1]
        elif token[0] == T.LABEL:
            labelName = token[1]
            uxn.symbolTable[labelName]=pc
        else:
            uxn.memory[pc]=token
            pc = pc + 1
    uxn.free = pc

# First pass: load tokens into memory and record label addresses
def resolveSymbols(uxn):
    global TRACE
    TRACE=TRACE+1
    
    # Set program start address
    for addr in range(len(uxn.memory)):
        token = uxn.memory[addr]

        # Skip empty memory
        if token[0] == T.EMPTY:
            continue

        # Handle absolute references ;label
        if token[0] == T.ABSREF:
            label = token[1]
            size = token[2]

            if label not in uxn.symbolTable:
                print(f"Error: Undefined label '{label}'")
                print("Run with `--dbg` flag for more information")
                exit()

            address = uxn.symbolTable[label]

            # Replace with literal
            uxn.memory[addr] = (T.LIT, address, size)
            
        elif token[0] == T.RELREF:
            label = token[1]
            size = token[2]

            if label not in uxn.symbolTable:
                print(f"Error: Undefined label '{label}'")
                print("Run with `--dbg` flag for more information")
                exit()

            target = uxn.symbolTable[label]

            # relative offset = target - current address
            offset = target - addr
            newAddr = addr + offset

            uxn.memory[addr] = (T.LIT, newAddr, size)

# Main execution loop: fetch, decode, and execute instructions
def runProgram(uxn):  
    if VV:
        print('*** RUNNING ***')
    
    uxn.progCounter = 0x100 # all programs must start at 0x100
    
    while True:

        token = uxn.memory[uxn.progCounter]
        
        if DBG:
            print('PC:',uxn.progCounter,' TOKEN:',token)
        
        # Case 1: Literal → push to working stack
        if token[0] == T.LIT:
            _, value, size = token
            uxn.stacks[0].append((value, size))

        # Case 2: Instruction → execute
        elif token[0] == T.INSTR:
            executeInstr(token, uxn)

        # Optional: catch unexpected tokens
        else:
            print("Error: Unknown token type at PC", uxn.progCounter, token)
            print("Run with `--dbg` flag for more information")
            exit()
        
        # Move to next instruction
        uxn.progCounter += 1

        if DBG:
            print('(WS,RS):',uxn.stacks)

# Full interpreter pipeline: preprocess → parse → assemble → execute
uxn = Uxn()
programText_noComments = stripComments(programText)
tokenStrings = tokeniseProgramText(programText_noComments)
tokensWithStrings = map(parseToken,tokenStrings)
tokens = populateTokens(tokensWithStrings) 

populateMemoryAndBuildSymbolTable(tokens,uxn)

resolveSymbols(uxn)

if DBG:
    for pc in range(256,uxn.free):
        print(pc,':',uxn.memory[pc])
    print('')
if VV:
    print(programText)

runProgram(uxn)