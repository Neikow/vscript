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

	push	10

	; statement_debug (tuple)
	mov		eax, _s0
	push	eax
	pop		eax
	call	sprint

	mov		eax, _s1
	push	eax
	pop		eax
	call	sprint

	mov		eax, [ebp - 2 * 4]
	push	eax	; (x)
	pop		eax
	call	iprintLF

	mov		eax, _s2
	push	eax

	; statement_debug (tuple)
	mov		eax, _s3
	push	eax
	pop		eax
	call	sprint

	mov		eax, _s1
	push	eax
	pop		eax
	call	sprint

	mov		eax, [ebp - 3 * 4]
	push	eax	; (y)
	pop		eax
	call	sprintLF

	mov		ebx, 0	; exit code
	call	_exit

section .data
_s0: db 'x = 10', 0h
_s1: db ' ', 0h
_s2: db 'Hello World', 0h
_s3: db 'y = "Hello World"', 0h
