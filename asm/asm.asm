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

	push	10	; (x)

if_else_0_0:
	; condition
	mov		eax, [ebp - 2 * 4]	; (x)
	cmp		eax, 0
	je		if_else_0_def

	; body
	push	100	; (z)

	; statement_debug (int)
	; op add
	mov		eax, [ebp + -2 * 4]	; (x)
	mov		ebx, eax
	mov		eax, [ebp - 3 * 4]	; (z)
	add		eax, ebx
	call	iprintLF

	jmp		if_else_0_end

if_else_0_def:
	; body
	; statement_debug (str)
	mov		eax, _s0
	call	sprintLF

if_else_0_end:

	mov		ebx, 0	; exit code
	call	_exit

section .data
_s0: db 'b', 0h
