; ZAX lowered .asm trace
; range: $0100..$2071 (end exclusive)

; func word_glob_const begin
word_glob_const:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld HL, (glob_words + 2)        ; 010B: 2A 00 00
push DE                        ; 010E: D5
ex DE, HL                      ; 010F: EB
push AF                        ; 0110: F5
push BC                        ; 0111: C5
push DE                        ; 0112: D5
ld HL, glob_words + 4          ; 0113: 21 00 00
pop DE                         ; 0116: D1
pop BC                         ; 0117: C1
pop AF                         ; 0118: F1
ld (hl), E                     ; 0119: 73
inc HL                         ; 011A: 23
ld (hl), D                     ; 011B: 72
ex DE, HL                      ; 011C: EB
pop DE                         ; 011D: D1
__zax_epilogue_0:
pop DE                         ; 011E: D1
pop BC                         ; 011F: C1
pop AF                         ; 0120: F1
ld SP, IX                      ; 0121: DD F9
pop IX                         ; 0123: DD E1
ret                            ; 0125: C9
; func main begin
; func word_glob_const end
main:
push IX                        ; 0126: DD E5
ld IX, $0000                   ; 0128: DD 21 00 00
add IX, SP                     ; 012C: DD 39
push AF                        ; 012E: F5
push BC                        ; 012F: C5
push DE                        ; 0130: D5
push HL                        ; 0131: E5
call word_glob_const           ; 0132: CD 00 00
__zax_epilogue_1:
pop HL                         ; 0135: E1
pop DE                         ; 0136: D1
pop BC                         ; 0137: C1
pop AF                         ; 0138: F1
ld SP, IX                      ; 0139: DD F9
pop IX                         ; 013B: DD E1
ret                            ; 013D: C9
; func main end

; symbols:
; label word_glob_const = $0100
; label __zax_epilogue_0 = $011E
; label main = $0126
; label __zax_epilogue_1 = $0135
; data glob_words = $2000
; label __zax_startup = $2010
