; ZAX lowered .asm trace
; range: $0100..$2001 (end exclusive)

; func touch_scalar_byte_glob begin
touch_scalar_byte_glob:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld A, (glob_b)                 ; 010B: 3A 00 00
ld (glob_b), A                 ; 010E: 32 00 00
ld H, $0000                    ; 0111: 26 00
ld L, A                        ; 0113: 6F
__zax_epilogue_0:
pop DE                         ; 0114: D1
pop BC                         ; 0115: C1
pop AF                         ; 0116: F1
ld SP, IX                      ; 0117: DD F9
pop IX                         ; 0119: DD E1
ret                            ; 011B: C9
; func main begin
; func touch_scalar_byte_glob end
main:
push IX                        ; 011C: DD E5
ld IX, $0000                   ; 011E: DD 21 00 00
add IX, SP                     ; 0122: DD 39
push AF                        ; 0124: F5
push BC                        ; 0125: C5
push DE                        ; 0126: D5
push HL                        ; 0127: E5
call touch_scalar_byte_glob    ; 0128: CD 00 00
__zax_epilogue_1:
pop HL                         ; 012B: E1
pop DE                         ; 012C: D1
pop BC                         ; 012D: C1
pop AF                         ; 012E: F1
ld SP, IX                      ; 012F: DD F9
pop IX                         ; 0131: DD E1
ret                            ; 0133: C9
; func main end

; symbols:
; label touch_scalar_byte_glob = $0100
; label __zax_epilogue_0 = $0114
; label main = $011C
; label __zax_epilogue_1 = $012B
; data glob_b = $2000
