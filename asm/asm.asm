; --------------------------
;     Generated assembly    
; --------------------------

%include	'functions.asm'
%include	'macros.asm'

section .text
global  _start

_start:
	xor		eax, eax
	xor		ebx, ebx
	xor		ecx, ecx
	xor		edx, edx
	mov		ebp, esp	; save program base pointer
	push	ebp

	push	12

; while statement
while0:
	; condition
	; x var
	mov		eax, [ebp - 2 * 4]
	; mov		eax, eax
	mov		ebx, 7
	cmp		eax, ebx
	jle		end_while0
	; body
	; statement_debug (int)
	; x var
	mov		eax, [ebp - 2 * 4]
	; mov		eax, eax
	call	iprintLF


; is_else statement
if_else_0_0:
	; condition
	; x var
	mov		eax, [ebp - 2 * 4]
	; mov		eax, eax
	mov		ebx, 10
	cmp		eax, ebx
	jne		if_else_0_1
	; body
	; statement_debug (str)
	mov		eax, str0
	call	sprintLF

	jmp		if_else_0_end
if_else_0_1:
	; condition
	; x var
	mov		eax, [ebp - 2 * 4]
	; mov		eax, eax
	mov		ebx, 10
	cmp		eax, ebx
	jle		if_else_0_def
	; body
	; statement_debug (str)
	mov		eax, str1
	call	sprintLF

	jmp		if_else_0_end

if_else_0_def:
	; body
	; statement_debug (str)
	mov		eax, str2
	call	sprintLF

if_else_0_end:

	; op sub_assign
	; x var
	mov		eax, [ebp - 2 * 4]
	; mov		eax, eax
	mov		ebx, 2
	sub		eax, ebx
	mov		[ebp - 2 * 4], eax
	jmp		while0

end_while0:
	mov		ebx, 0	; exit code
	call	_exit

section .data
str0: db 'x is 10', 0h
str1: db 'x is greater than 10', 0h
str2: db 'x is smaller than 10', 0h

section .bss
