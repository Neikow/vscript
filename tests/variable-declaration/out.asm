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

	mov		eax, 10
	push	eax	; (x)

	; statement_debug (tuple)
	mov		eax, _s0
	call	sprint

	mov		eax, _s1
	call	sprint

	mov		eax, [ebp - 2 * 4]	; (x)
	call	iprintLF

	mov		eax, _s2
	push	eax	; (y)

	; statement_debug (tuple)
	mov		eax, _s3
	call	sprint

	mov		eax, _s1
	call	sprint

	mov		eax, [ebp - 3 * 4]	; (y)
	call	sprintLF

	mov		ebx, 0	; exit code
	call	_exit

section .data
_s0: db 'x = 10', 0h
_s1: db ' ', 0h
_s2: db 'Hello World', 0h
_s3: db 'y = "Hello World"', 0h
