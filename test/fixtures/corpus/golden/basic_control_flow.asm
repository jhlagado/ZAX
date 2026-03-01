; ZAX lowered .asm trace
; range: $0000..$0045 (end exclusive)

; func main begin
main:
push IX                        ; 0000: DD E5
ld IX, $0000                   ; 0002: DD 21 00 00
add IX, SP                     ; 0006: DD 39
push AF                        ; 0008: F5
push BC                        ; 0009: C5
push DE                        ; 000A: D5
push HL                        ; 000B: E5
jp z, __zax_if_else_1          ; 000C: CA 00 00
nop                            ; 000F: 00
jp __zax_if_end_2              ; 0010: C3 00 00
__zax_if_else_1:
nop                            ; 0013: 00
__zax_if_end_2:
__zax_while_cond_3:
jp z, __zax_while_end_4        ; 0014: CA 00 00
nop                            ; 0017: 00
jp __zax_while_cond_3          ; 0018: C3 00 00
__zax_repeat_body_5:
__zax_while_end_4:
nop                            ; 001B: 00
jp nz, __zax_repeat_body_5     ; 001C: C2 00 00
jp __zax_select_dispatch_6     ; 001F: C3 00 00
__zax_case_8:
nop                            ; 0022: 00
jp __zax_select_end_7          ; 0023: C3 00 00
__zax_select_else_9:
nop                            ; 0026: 00
jp __zax_select_end_7          ; 0027: C3 00 00
__zax_select_dispatch_6:
push HL                        ; 002A: E5
ld H, $0000                    ; 002B: 26 00
ld L, A                        ; 002D: 6F
ld a, l                        ; 002E: 7D
cp imm8                        ; 002F: FE 00
jp nz, __zax_select_next_10    ; 0031: C2 00 00
pop HL                         ; 0034: E1
jp __zax_case_8                ; 0035: C3 00 00
__zax_select_next_10:
pop HL                         ; 0038: E1
jp __zax_select_else_9         ; 0039: C3 00 00
__zax_epilogue_0:
__zax_select_end_7:
pop HL                         ; 003C: E1
pop DE                         ; 003D: D1
pop BC                         ; 003E: C1
pop AF                         ; 003F: F1
ld SP, IX                      ; 0040: DD F9
pop IX                         ; 0042: DD E1
ret                            ; 0044: C9
; func main end

; symbols:
; label main = $0000
; label __zax_if_else_1 = $0013
; label __zax_if_end_2 = $0014
; label __zax_while_cond_3 = $0014
; label __zax_repeat_body_5 = $001B
; label __zax_while_end_4 = $001B
; label __zax_case_8 = $0022
; label __zax_select_else_9 = $0026
; label __zax_select_dispatch_6 = $002A
; label __zax_select_next_10 = $0038
; label __zax_epilogue_0 = $003C
; label __zax_select_end_7 = $003C
