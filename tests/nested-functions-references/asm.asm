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
	mov		eax, _s9
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

	push	20
	call	fn_func11
	add		esp, 1 * 4	; removes arguments from stack
	; statement_debug (tuple)
	mov		eax, _s9
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

	mov		ebx, 0	; exit code
	call	_exit

; func2(arg1: uint, arg2: uint): void
fn_func22:
	push	ebp
	mov		ebp, esp	; saves the function base pointer

	; statement_debug (tuple)
	mov		eax, _s4
	push	eax
	pop		eax
	call	sprint

	mov		eax, _s1
	push	eax
	pop		eax
	call	sprint

	mov		eax, [ebp + 8 * 4]
	push	eax	; (arg)
	pop		eax
	call	iprintLF

	; statement_debug (tuple)
	mov		eax, _s5
	push	eax
	pop		eax
	call	sprint

	mov		eax, _s1
	push	eax
	pop		eax
	call	sprint

	mov		eax, [ebp + 9 * 4]
	push	eax	; (x)
	pop		eax
	call	iprintLF

	; statement_debug (tuple)
	mov		eax, _s6
	push	eax
	pop		eax
	call	sprint

	mov		eax, _s1
	push	eax
	pop		eax
	call	sprint

	mov		eax, [ebp + 5 * 4]
	push	eax	; (y)
	pop		eax
	call	iprintLF

	; statement_debug (tuple)
	mov		eax, _s7
	push	eax
	pop		eax
	call	sprint

	mov		eax, _s1
	push	eax
	pop		eax
	call	sprint

	mov		eax, [ebp + 2 * 4]
	push	eax	; (arg1)
	pop		eax
	call	iprintLF

	; statement_debug (tuple)
	mov		eax, _s8
	push	eax
	pop		eax
	call	sprint

	mov		eax, _s1
	push	eax
	pop		eax
	call	sprint

	mov		eax, [ebp + 3 * 4]
	push	eax	; (arg2)
	pop		eax
	call	iprintLF


	add		esp, 0 * 4
	pop		ebp
	ret

; func1(arg: uint): void
fn_func11:
	push	ebp
	mov		ebp, esp	; saves the function base pointer

	; statement_debug (tuple)
	mov		eax, _s0
	push	eax
	pop		eax
	call	sprint

	mov		eax, _s1
	push	eax
	pop		eax
	call	sprint

	mov		eax, [ebp + 3 * 4]
	push	eax	; (x)
	pop		eax
	call	iprintLF

	; statement_debug (tuple)
	mov		eax, _s2
	push	eax
	pop		eax
	call	sprint

	mov		eax, _s1
	push	eax
	pop		eax
	call	sprint

	mov		eax, [ebp + 2 * 4]
	push	eax	; (arg)
	pop		eax
	call	iprintLF

	push	100

	push	200

	; statement_debug (tuple)
	mov		eax, _s0
	push	eax
	pop		eax
	call	sprint

	mov		eax, _s1
	push	eax
	pop		eax
	call	sprint

	mov		eax, [ebp + 3 * 4]
	push	eax	; (x)
	pop		eax
	call	iprintLF

	; statement_debug (tuple)
	mov		eax, _s2
	push	eax
	pop		eax
	call	sprint

	mov		eax, _s1
	push	eax
	pop		eax
	call	sprint

	mov		eax, [ebp + 2 * 4]
	push	eax	; (arg)
	pop		eax
	call	iprintLF

	; statement_debug (tuple)
	mov		eax, _s3
	push	eax
	pop		eax
	call	sprint

	mov		eax, _s1
	push	eax
	pop		eax
	call	sprint

	mov		eax, [ebp - 1 * 4]
	push	eax	; (y)
	pop		eax
	call	iprintLF

	push	60
	push	40
	call	fn_func22
	add		esp, 2 * 4	; removes arguments from stack
	; statement_debug (tuple)
	mov		eax, _s0
	push	eax
	pop		eax
	call	sprint

	mov		eax, _s1
	push	eax
	pop		eax
	call	sprint

	mov		eax, [ebp + 3 * 4]
	push	eax	; (x)
	pop		eax
	call	iprintLF

	; statement_debug (tuple)
	mov		eax, _s2
	push	eax
	pop		eax
	call	sprint

	mov		eax, _s1
	push	eax
	pop		eax
	call	sprint

	mov		eax, [ebp + 2 * 4]
	push	eax	; (arg)
	pop		eax
	call	iprintLF

	; statement_debug (tuple)
	mov		eax, _s3
	push	eax
	pop		eax
	call	sprint

	mov		eax, _s1
	push	eax
	pop		eax
	call	sprint

	mov		eax, [ebp - 1 * 4]
	push	eax	; (y)
	pop		eax
	call	iprintLF


	add		esp, 2 * 4
	pop		ebp
	ret

section .data
_s0: db '  func1: x   = 10', 0h
_s1: db ' ', 0h
_s2: db '  func1: arg = 20', 0h
_s3: db '  func1: y  = 100', 0h
_s4: db '    func2: arg  = 20', 0h
_s5: db '    func2: x    = 10', 0h
_s6: db '    func2: y   = 100', 0h
_s7: db '    func2: arg1 = 40', 0h
_s8: db '    func2: arg2 = 60', 0h
_s9: db 'x', 0h
